import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Application, Request, Response } from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { logger } from "shared-data";
import { Server } from "socket.io";
import {
  getCachedGpsMessage,
  getCachedLoginMessage,
  getCachedStatusMessage,
  getDeviceInfoById,
} from "../controllers/MqttController";
import { Constants, StatusCodes } from "../helpers/constants";
import { DecodedJwtPayload } from "../types/types";

const jsonParser = bodyParser.json();

export class Api {
  private app: Application;
  private server: http.Server;
  private io: Server;

  constructor(app: Application) {
    this.app = app;
    this.server = http.createServer(app);

    this.io = new Server(this.server, {
      path: "/iot_link/",
      cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.app.use(cookieParser());
    this.createServer();
    this.setupSocketListeners();
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
    this.app.use(cors());

    // Login route
    this.app.post(
      `/ui/api/login`,
      jsonParser,
      (req: Request, res: Response) : void => {
        const { username, password } = req.body;

        if (
          username === process.env.USERNAME &&
          password === process.env.PASSWORD
        ) {
          const user = { name: username };
          const accessToken = jwt.sign(user, process.env.JWT_SECRET!, {
            expiresIn: "1d",
          });

          res.status(StatusCodes.OK).json({ accessToken });
        } else {
          res
            .status(StatusCodes.UNAUTHORIZED)
            .send("Username or password is incorrect");
        }
      }
    );

    this.app.post("/ui/api/logout", (_req: Request, res: Response) : void => {
      res.clearCookie("Velo.JWT", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      res.status(StatusCodes.OK).send("Logged out successfully");
    });

    // Define API endpoint to get the last message for devices
    this.app.get(`/ui/api/statusMessage`, (req: Request, res: Response) : void => {
      const decoded = this.verifyToken(req) as DecodedJwtPayload;

      if (!decoded) {
        res
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
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send("Internal Server Error");
      }
    });

    // Define API endpoint to get the last login message for devices
    this.app.get(`/ui/api/loginMessage`, (req: Request, res: Response) : void => {
      const decoded = this.verifyToken(req) as DecodedJwtPayload;

      if (!decoded) {
        res
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
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send("Internal Server Error");
      }
    });

    // Define API endpoint to get the last gps message for devices
    this.app.get(`/ui/api/gpsMessage`, (req: Request, res: Response) : void => {
      const decoded = this.verifyToken(req) as DecodedJwtPayload;

      if (!decoded) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .send("Invalid or expired token");
      }

      if (!decoded.exp || Date.now() >= decoded.exp * 1000) {
        const link = `https://${Constants.VELOPERA_HOST}/login`;
        logger.warn(`Session expired! Forwarding to ${link}`);
        return res.redirect(link);
      }

      try {
        const deviceStatus = getCachedGpsMessage();
        if (deviceStatus) {
          res.json(deviceStatus);
        } else {
          res.status(StatusCodes.NOT_FOUND).send("Device Not Found");
        }
      } catch (e) {
        logger.error("/Velo AUTH INTERNAL FAILURE [312] " + JSON.stringify(e));
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send("Internal Server Error");
      }
    });

    // Define API endpoint to get the last status, login and gps message for specified device
    this.app.get(
      `/ui/api/deviceInfo/:id`,
      (req: Request, res: Response) : void => {
        const decoded = this.verifyToken(req) as DecodedJwtPayload;

        if (!decoded) {
          res
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
          const deviceInfo = getDeviceInfoById(veloId);
          if (deviceInfo.status || deviceInfo.login || deviceInfo.gps) {
            res.json(deviceInfo);
          } else {
            res
              .status(StatusCodes.NOT_FOUND)
              .send("No device found with the specified Id");
          }
        } catch (e) {
          logger.error(
            "/Velo AUTH INTERNAL FAILURE [312] " + JSON.stringify(e)
          );
          res
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

  setupSocketListeners() {
    this.io.on("connection", (socket) => {
      logger.debug("Client connected:", socket.id);

      socket.on("disconnect", () => {
        logger.info("Client disconnected:", socket.id);
      });
    });
  }

  sendStatusUpdate(statusData: any) {
    logger.debug("Sending status update to Socket:", statusData);
    this.io.emit("statusUpdate", statusData);
  }

  sendLoginUpdate(loginData: any) {
    logger.debug("Sending login update to Socket:", loginData);
    this.io.emit("loginUpdate", loginData);
  }

  sendGpsUpdate(gpsData: any) {
    logger.debug("Sending gps update to Socket:", gpsData);
    this.io.emit("gpsUpdate", gpsData);
  }
}
