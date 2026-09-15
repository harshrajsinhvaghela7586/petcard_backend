require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const AdminSignup = require("../models/AdminSignup");

const ADMIN_EMAIL = "admin@petcard.com";
const ADMIN_NAME = "PetCard Admin";

// bcrypt hash of: Admin@123
const ADMIN_PASSWORD_HASH = "$2b$12$FceDXEMTZmNaNwEAdYYC3O6dy7vSNULpjylscwomN5ii5kHRQUTXK";

const run = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log(`Admin already exists: ${existingAdmin.email}`);
      process.exit(0);
    }

    const passwordHash = ADMIN_PASSWORD_HASH;

    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: passwordHash,
      role: "admin",
      isVerified: true,
    });

    await AdminSignup.deleteMany({});

    console.log("Admin seed created successfully.");
    console.log(`Email: ${admin.email}`);
    console.log("Password: Admin@123");
    console.log("Password is stored as a bcrypt hash in MongoDB.");
  } catch (error) {
    console.error("Admin seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
