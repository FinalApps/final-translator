import fs from "fs";
import "dotenv/config";
import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";
import { readFile } from "fs/promises";
import { languages } from "./languages.js";
import { map, unMap } from "./ignorer.js";

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

const client = new TranslateClient({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
  region: AWS_REGION,
});

const translateFiles = async () => {
  fs.readdir("./locales/en", function (err, files) {
    if (err) {
      console.error("Could not list the directory.", err);
      process.exit(1);
    }

    files.forEach(async function (file) {
      const json = JSON.parse(
        await readFile(new URL(`./locales/en/${file}`, import.meta.url))
      );
      const resp = await translateJSON(json, languages, true);
      for (let lang in resp) {
        fs.mkdirSync(
          `./locales/${lang}`,
          { recursive: true },
          async function (err) {
            if (err) return cb(err);
          }
        );
        fs.writeFileSync(
          `./locales/${lang}/${file}`,
          JSON.stringify(resp[lang])
        );
        console.log("Wrote: ", lang);
      }
    });
  });
};

async function translateText(text, source, target) {
  let { word, double_brackets_map, single_brackets_map } = map(text);

  const command = new TranslateTextCommand({
    Text: word,
    SourceLanguageCode: source, // required
    TargetLanguageCode: target, // required
    Settings: {
      Formality: "FORMAL",
      Profanity: "MASK",
      Brevity: "ON",
    },
  });
  const { TranslatedText } = await client.send(command);
  const result = unMap(
    TranslatedText,
    double_brackets_map,
    single_brackets_map
  );
  return result;
}

const translateJSON = async (obj, langsToTranslate, displayLang) => {
  let resp = {};

  for (let lang of langsToTranslate) {
    for (let key in obj) {
      let word = "";

      try {
        word =
          typeof obj[key] === "object"
            ? await translateJSON(obj[key], [lang], false)
            : await translateText(obj[key], "en", lang);
      } catch (e) {
        console.error(e);
        word = "";
      }

      if (displayLang) {
        if (!resp[lang]) console.log("Translating: ", lang);

        resp[lang] = resp[lang] || {};
        resp[lang][key] = word;
      } else {
        resp[key] = word;
      }
    }
  }

  return resp;
};

translateFiles();
