import "reflect-metadata";
import { DataSource } from "typeorm";
import { createPostgresOptions } from "@wts/db";

export const AppDataSource = new DataSource(
  createPostgresOptions(process.env, {
    synchronize: true
  })
);