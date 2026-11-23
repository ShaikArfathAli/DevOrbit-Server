
const express = require("express");
const userRouter = express.Router();

const { connectionRequestModel } = require("../model/connectionRequest");
const { userAuth } = require("../middlewares/auth");
const userModel = require("../model/user");

// Received connection requests
userRouter.get("/user/request/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequest = await connectionRequestModel
      .find({
        toUserId: loggedInUser._id,
        status: "interested",
      })
      .populate("fromUserId", [
        "firstName",
        "lastName",
        "about",
        "photoUrl",
        "age",
        "skills",
      ]);

    res.json({
      message: "Data fetched successfully",
      Data: connectionRequest,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// Sent connection requests
userRouter.get("/user/request/sent", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequest = await connectionRequestModel
      .find({
        fromUserId: loggedInUser._id,
        status: "interested",
      })
      .populate("toUserId", [
        "firstName",
        "lastName",
        "about",
        "photoUrl",
        "age",
        "skills",
      ]);

    res.json({
      message: "Data fetched successfully",
      Data: connectionRequest,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// Accepted connections
userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connections = await connectionRequestModel
      .find({
        $or: [
          { fromUserId: loggedInUser._id, status: "accepted" },
          { toUserId: loggedInUser._id, status: "accepted" },
        ],
      })
      .populate("fromUserId", [
        "firstName",
        "lastName",
        "age",
        "photoUrl",
        "about",
        "skills",
      ])
      .populate("toUserId", [
        "firstName",
        "lastName",
        "age",
        "photoUrl",
        "about",
        "skills",
      ]);

    const data = [];

    for (const row of connections) {
      const fromDoc = row?.fromUserId;
      const toDoc = row?.toUserId;

      if (!fromDoc?._id || !toDoc?._id) continue;

      const isFromMe = fromDoc._id.equals(loggedInUser._id);
      const otherUser = isFromMe ? toDoc : fromDoc;

      if (otherUser?._id) {
        data.push(otherUser);
      }
    }

    res.json({
      message: "Connections fetched successfully",
      Data: data,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// Developer feed
userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      50
    );

    const skip = (page - 1) * limit;

    // Find all requests involving the logged-in user
    const relatedRequests = await connectionRequestModel
      .find({
        $or: [
          { fromUserId: loggedInUser._id },
          { toUserId: loggedInUser._id },
        ],
      })
      .select("fromUserId toUserId status createdAt");

    const hideStatuses = new Set(["accepted", "rejected", "ignore"]);
    const hideUserIds = new Set();
    const reqMap = new Map();

    for (const request of relatedRequests) {
      const from = request.fromUserId.toString();
      const to = request.toUserId.toString();

      const currentUserId = loggedInUser._id.toString();
      const otherUserId = from === currentUserId ? to : from;

      if (hideStatuses.has(request.status)) {
        hideUserIds.add(otherUserId);
      } else if (request.status === "interested") {
        reqMap.set(otherUserId, {
          exists: true,
          status: request.status,
          direction: from === currentUserId ? "outgoing" : "incoming",
          requestId: request._id,
        });
      }
    }

    // Only return public profile fields.
    // Never send password hashes or private email addresses.
    const users = await userModel
      .find({
        _id: {
          $ne: loggedInUser._id,
          $nin: Array.from(hideUserIds),
        },
      })
      .select(
        "firstName lastName age gender about photoUrl skills createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const data = users.map((user) => {
      const userData = user.toObject();
      const requestInfo = reqMap.get(user._id.toString());

      if (requestInfo) {
        userData.requestInfo = requestInfo;
      }

      return userData;
    });

    res.json({
      message: "Feed fetched successfully",
      Data: data,
      page,
      limit,
    });
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({
      message: "Unable to fetch feed",
    });
  }
});

module.exports = userRouter;
