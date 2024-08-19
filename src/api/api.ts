import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Application, Request, Response } from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { logger } from "shared-data";
import {
  getCachedLoginMessage,
  getCachedMessageById,
  getCachedStatusMessage,
} from "../controllers/MqttController";
import { Constants, StatusCodes } from "../helpers/constants";
import { DecodedJwtPayload } from "../types/types";

const jsonParser = bodyParser.json();

export class Api {
  private app: Application;
  private server: http.Server;

  constructor(app: Application) {
    this.app = app;
    this.server = http.createServer(app);

    this.app.use(cookieParser());

    this.createServer();
  }

  // Helper function to verify JWT
  private verifyToken(req: Request): DecodedJwtPayload | null {
    const token = req.cookies["Velo.JWT"];
    if (!token) return null;
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as DecodedJwtPayload;
    } catch (e) {
      if (e instanceof Error) {
        logger.error(`Token verification failed: ${e.message}`);
      } else {
        logger.error(`Token verification failed with unknown error`);
      }
      return null;
    }
  }

  createServer() {
    // Enable CORS for cross-origin requests
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
      })
    );

    // Login route
    this.app.post(
      `/ui/api/login`,
      jsonParser,
      (req: Request, res: Response) => {
        const { username, password } = req.body;

        if (
          username === process.env.USERNAME &&
          password === process.env.PASSWORD
        ) {
          const user = { name: username };
          const accessToken = jwt.sign(user, process.env.JWT_SECRET!, {
            expiresIn: "1d",
          });

          return res.status(StatusCodes.OK).json({ accessToken });
        } else {
          return res
            .status(StatusCodes.UNAUTHORIZED)
            .send("Username or password is incorrect");
        }
      }
    );

    this.app.post("/ui/api/logout", (_req: Request, res: Response) => {
      res.clearCookie("Velo.JWT", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      return res.status(StatusCodes.OK).send("Logged out successfully");
    });

    // Define API endpoint to get the last message for devices
    this.app.get(`/ui/api/lastStatusMessage`, (req: Request, res: Response) => {
      const decoded = this.verifyToken(req);

      if (!decoded) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send("Invalid or expired token");
      }

      if (!decoded.exp || Date.now() >= decoded.exp * 1000) {
        const link = `https://${Constants.VELOPERA_HOST}/login`;
        logger.warn(`Session expired! Forwarding to ${link}`);
        return res.redirect(link);
      }

      try {
        const allDevicesStatus = getCachedStatusMessage();
        res.json(allDevicesStatus);
      } catch (e) {
        logger.error("/Velo AUTH INTERNAL FAILURE [312] " + JSON.stringify(e));
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send("Internal Server Error");
      }
    });

    // Define API endpoint to get the last login message for devices
    this.app.get(`/ui/api/lastLoginMessage`, (req: Request, res: Response) => {
      const decoded = this.verifyToken(req);

      if (!decoded) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send("Invalid or expired token");
      }

      if (!decoded.exp || Date.now() >= decoded.exp * 1000) {
        const link = `https://${Constants.VELOPERA_HOST}/login`;
        logger.warn(`Session expired! Forwarding to ${link}`);
        return res.redirect(link);
      }

      try {
        const deviceStatus = getCachedLoginMessage();
        if (deviceStatus) {
          res.json(deviceStatus);
        } else {
          res.status(StatusCodes.NOT_FOUND).send("Device Not Found");
        }
      } catch (e) {
        logger.error("/Velo AUTH INTERNAL FAILURE [312] " + JSON.stringify(e));
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send("Internal Server Error");
      }
    });

    // Define API endpoint to get the last message by ID
    this.app.get(
      `/ui/api/lastStatusMessage/:id`,
      (req: Request, res: Response) => {
        const decoded = this.verifyToken(req);

        if (!decoded) {
          return res
            .status(StatusCodes.UNAUTHORIZED)
            .send("Invalid or expired token");
        }

        if (!decoded.exp || Date.now() >= decoded.exp * 1000) {
          const link = `https://${Constants.VELOPERA_HOST}/login`;
          logger.warn(`Session expired! Forwarding to ${link}`);
          return res.redirect(link);
        }

        const veloId = req.params.id;

        try {
          const deviceStatus = getCachedMessageById(veloId);
          if (deviceStatus) {
            res.json(deviceStatus);
          } else {
            res
              .status(StatusCodes.NOT_FOUND)
              .send("No device found with the specified Id");
          }
        } catch (e) {
          logger.error(
            "/Velo AUTH INTERNAL FAILURE [312] " + JSON.stringify(e)
          );
          return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send("Internal Server Error");
        }
      }
    );

    // Start the HTTP server and listen on the designated port
    const PORT = process.env.SERVER_PORT || 9090;
    this.server.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  }
}
