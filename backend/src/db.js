import { Sequelize } from "sequelize";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: process.env.DATABASE_FILE || "./db/db.sqlite",
  logging: false
});

export default sequelize;