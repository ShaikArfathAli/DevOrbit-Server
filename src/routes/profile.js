
const express = require("express");
const profileRouter = express.Router();

const { userAuth } = require("../middlewares/auth");
const { validateEditprofile } = require("../utils/validations");

// View Profile
profileRouter.get("/profile/view", userAuth, async (req, res) => {
    try {
        const userResponse = req.user.toObject();
        delete userResponse.password;

        res.status(200).send(userResponse);
    } catch (err) {
        res.status(500).send("Something went wrong: " + err.message);
    }
});

// Update Profile
profileRouter.patch("/profile/update", userAuth, async (req, res) => {
    try {
        validateEditprofile(req);

        const user = req.user;

        Object.keys(req.body).forEach((key) => {
            user[key] = req.body[key];
        });

        await user.save();

        res.status(200).send("Profile Updated successfully.");

    } catch (err) {
        res.status(400).send("Something went wrong: " + err.message);
    }
});

module.exports = profileRouter;
