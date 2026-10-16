import createHttpError from "http-errors";
import z from "zod";

export const validateData = (schema, data) => {
  const result = schema.safeParse(data ?? {});

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    const errors = Object.fromEntries(
      Object.entries(fieldErrors).map(([field, messages]) => [field, messages[0]]),
    );
    throw createHttpError(400, "Validation failed", { errors });
  }

  return result.data;
};
