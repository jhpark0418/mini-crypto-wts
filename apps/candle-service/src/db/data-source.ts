import "reflect-metadata";
import { DataSource } from "typeorm";
import { createPostgresOptions } from "@cmp/db";


export const AppDataSource = new DataSource(
    createPostgresOptions(process.env, {
        synchronize: true
    })
);