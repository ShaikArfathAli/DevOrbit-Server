
const express = require("express");
const { userAuth } = require("../middlewares/auth");

const chatbotRouter = express.Router();

chatbotRouter.post("/chatbot/message", userAuth, (req, res) => {
    return res.status(503).json({
        message: "AI chatbot is temporarily unavailable."
    });
});

module.exports = chatbotRouter;
