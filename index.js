import fs from "fs/promises";
import path from "path";
import "dotenv/config";
import {
    TranslateClient,
    TranslateTextCommand,
} from "@aws-sdk/client-translate";
import { languages } from "./languages.js";
import { map, unMap } from "./ignorer.js";

// Configuration
const AWS_CONFIG = {
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION,
};

const client = new TranslateClient(AWS_CONFIG);

const TRANSLATION_SETTINGS = {
    Formality: "FORMAL",
    Profanity: "MASK",
    Brevity: "ON",
};

// Progress tracking class
class TranslationProgress {
    constructor(totalFiles, totalLanguages) {
        this.totalFiles = totalFiles;
        this.totalLanguages = totalLanguages;
        this.currentFile = 0;
        this.progress = new Map();
    }

    initializeFile(filename, totalKeys) {
        this.currentFile++;
        this.progress.set(filename, {
            totalKeys,
            languages: new Map(
                languages.map(lang => [lang, { completed: 0, total: totalKeys }])
            )
        });
        this.logFileProgress(filename);
    }

    updateProgress(filename, lang, completedKeys) {
        const fileProgress = this.progress.get(filename);
        if (fileProgress && fileProgress.languages.has(lang)) {
            fileProgress.languages.get(lang).completed = completedKeys;
            this.logProgress(filename, lang);
        }
    }

    getProgress(filename, lang) {
        const fileProgress = this.progress.get(filename);
        return fileProgress.languages.get(lang).completed;
    }

    logFileProgress(filename) {
        console.log(`\n[${filename}]: ${this.currentFile}/${this.totalFiles}`);
    }

    logProgress(filename, lang) {
        const fileProgress = this.progress.get(filename);
        const langProgress = fileProgress.languages.get(lang);
        const percentage = Math.round((langProgress.completed / langProgress.total) * 100);
        const langIndex = languages.indexOf(lang) + 1;
        process.stdout.write(`\rTranslating to ${lang} [${langIndex}/${this.totalLanguages}]: ${percentage}%${' '.repeat(20)}`);
    }
}

async function translateWithRetry(text, source, target, maxRetries = 3) {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            const { word, double_brackets_map, single_brackets_map } = map(text);

            const command = new TranslateTextCommand({
                Text: word,
                SourceLanguageCode: source,
                TargetLanguageCode: target,
                Settings: TRANSLATION_SETTINGS,
            });

            const { TranslatedText } = await client.send(command);
            return unMap(TranslatedText, double_brackets_map, single_brackets_map);
        } catch (error) {
            attempts++;
            if (attempts === maxRetries) {
                throw new Error(`Failed to translate after ${maxRetries} attempts: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
    }
}

function countTotalKeys(obj) {
    let count = 0;
    for (const value of Object.values(obj)) {
        if (typeof value === 'object') {
            count += countTotalKeys(value);
        } else {
            count++;
        }
    }
    return count;
}

async function translateJSON(obj, langsToTranslate, filename, progress, displayLang = true) {
    const resp = {};

    for (const lang of langsToTranslate) {
        let completedKeys = 0;
        if (!displayLang) completedKeys = progress.getProgress(filename, lang);

        for (const [key, value] of Object.entries(obj)) {
            const translatedValue = typeof value === 'object'
                ? await translateJSON(value, [lang], filename, progress, false)
                : await translateWithRetry(value, "en", lang);

            if (typeof value !== 'object') {
                completedKeys++;
                progress.updateProgress(filename, lang, completedKeys);
            }

            if (displayLang) {
                resp[lang] = resp[lang] || {};
                resp[lang][key] = translatedValue;
            }
            else resp[key] = translatedValue;
        }
    }

    return resp;
}

async function translateFiles() {
    try {
        const files = await fs.readdir("./input/en");
        const progress = new TranslationProgress(files.length, languages.length);

        for (const file of files) {
            try {
                const filePath = new URL(`./input/en/${file}`, import.meta.url);
                const content = await fs.readFile(filePath, 'utf-8');
                const json = JSON.parse(content);

                const totalKeys = countTotalKeys(json);
                progress.initializeFile(file, totalKeys);

                const translations = await translateJSON(json, languages, file, progress);

                await Promise.all(Object.entries(translations).map(async ([lang, translation]) => {
                    const dirPath = `./locales/${lang}`;
                    const filePath = path.join(dirPath, file);

                    await fs.mkdir(dirPath, { recursive: true });
                    await fs.writeFile(filePath, JSON.stringify(translation, null, 2));
                }));

                console.log(`\n✓ Successfully completed ${file}`);
            } catch (error) {
                console.error(`\nError processing file ${file}:`, error);
            }
        }

        console.log('\nTranslation process completed!');
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

translateFiles();
