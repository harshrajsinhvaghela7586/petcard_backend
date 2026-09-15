const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || "";

        const [scheme, headerToken] =
            authHeader.split(" ");

        // Prefer HttpOnly cookie.
        // Bearer token can remain as a fallback for APIs/tools.
        const token =
            req.cookies?.petcard_token ||
            (scheme === "Bearer" ? headerToken : null);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error(
                "JWT_SECRET is not defined in .env"
            );
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(
            decoded.userId
        ).select("-password");

        if (
            !user ||
            !user.isVerified ||
            user.role !== "admin"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid or unauthorized account",
            });
        }

        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired authentication",
        });
    }
};

module.exports = {
    requireAuth,
};