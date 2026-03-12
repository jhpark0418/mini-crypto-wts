import "reflect-metadata";
import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { CandleEntity } from "./entities/candle.entity.js";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [CandleEntity],
    synchronize: true,
    logging: false,
});