import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Friendship = sequelize.define("Friendship", {
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['senderId', 'receiverId']
    }
  ]
});

export default Friendship;
