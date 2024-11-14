# i18n JSON generator

This script generates i18n json files for all the languages using AWS API

## Feautes

- Supports multiple languages
- Ignores special characters
- Caches already generated keys

## Usage

- Duplicate the `.env.example` file and create a `.env` file

```sh
    AWS_ACCESS_KEY_ID = "ADFLJFSLFSDALFSD"
    AWS_SECRET_ACCESS_KEY = "adsfASdladsflkfadslasfdal"
    AWS_REGION = "us-east-1"
```

- Add AWS credentials
- Put your `en` folder inside the `input` folder
- Add languages to the `languages.js` file
- Run the `index.js` file

```sh
    node index.js
```

- The output will be generated inside a folder called `locales`
