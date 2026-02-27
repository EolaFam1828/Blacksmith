import YAML from "yaml";

export const formatJson = (value) => JSON.stringify(value, null, 2);
export const formatYaml = (value) => YAML.stringify(value).trimEnd();

export const truncate = (value, max = 500) => {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
};
