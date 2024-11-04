export function map(str) {
  // encode urls if exists in the str
  str = urlEncoder(str);

  let { map: double_brackets_map, word: initial_ignored_word } =
    mapByDoubleBracket(str);
  let { map: single_brackets_map, word: ignored_word } =
    mapBySingleBracket(initial_ignored_word);

  return {
    word: ignored_word,
    double_brackets_map,
    single_brackets_map: single_brackets_map,
  };
}

export function unMap(str, double_brackets_map, single_brackets_map) {
  let word = unmapBySingleBracket(str, single_brackets_map);
  word = unmapByDoubleBracket(word, double_brackets_map);

  // decode urls if exists in the str
  word = urlDecoder(word);

  return word;
}

function mapBySingleBracket(str) {
  return mapIgnoredValues(str, "{", "}", "{", "}");
}

function unmapBySingleBracket(str, map) {
  return unmapIgnoredValues(str, map, "{", "}", "{", "}");
}

function mapByDoubleBracket(str) {
  return mapIgnoredValues(str, "{{", "}}", "{", "}");
}

function unmapByDoubleBracket(str, map) {
  return unmapIgnoredValues(str, map, "{{", "}}", "{", "}");
}

function mapIgnoredValues(str, start, end, replaced_start, replaced_end) {
  let counter = 0;
  let map = {};

  let regex = new RegExp(`${start}(.*?)${end}`, "g");

  let new_str = str.replace(regex, function (word) {
    word = word.substring(start.length, word.length - end.length);

    // const key = "*".repeat(counter)
    const key = counter;

    map[`${key}`] = word;

    let locked_ignored = replaced_start + key + replaced_end;

    counter++;
    return locked_ignored;
  });

  return { word: new_str, map: map };
}

function unmapIgnoredValues(
  str,
  map,
  start,
  end,
  replaced_start,
  replaced_end
) {
  for (const [key, value] of Object.entries(map)) {
    let for_replace = replaced_start + key + replaced_end;

    str = str.replace(for_replace, start + value + end);
  }

  return str;
}

// URL detector & encode AND decoder
function urlEncoder(text) {
  // url finder regex => url
  const regex =
    /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!;:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!;:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!;:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/gim;

  let new_text = text.replace(regex, function (url) {
    url = `{` + url + `}`;
    return url;
  });

  return new_text;
}

function urlDecoder(text) {
  // url finder regex => {url}
  const regex =
    /{(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!;:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!;:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!;:,.]*\)|[A-Z0-9+&@#\/%=~_|$])}/gim;

  let new_text = text.replace(regex, function (url) {
    url = url.substring(1, url.length - 1);
    return url;
  });

  return new_text;
}
