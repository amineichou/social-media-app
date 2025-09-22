import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const BlacklistedToken = sequelize.define("BlacklistedToken", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: "blacklisted_tokens",
  timestamps: true
});

export default BlacklistedToken;
