import ora from "ora";

export const createSpinner = (text) => ora({ text, spinner: "dots" });

export const withSpinner = async (text, asyncFn) => {
  const spinner = createSpinner(text);
  spinner.start();
  try {
    const result = await asyncFn();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail(error.message);
    throw error;
  }
};
