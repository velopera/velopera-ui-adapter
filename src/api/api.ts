import cors from "cors";
import { Request, Response, Router } from "express";
import { logger } from "shared-data";
import {
  getCachedMessage,
  getCachedMessageById,
} from "../controllers/MqttController";
import { Constants, StatusCodes } from "../helpers/constants";

const jsonwt = require("jsonwebtoken");

export class ApiRoutes {
  private router: Router;

  constructor() {
    this.router = Router();

    this.router.use(
      cors({
        origin: ["https://velopera.voxel.at"],
        credentials: true,
      })
    );

    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post("/login", this.login.bind(this));
    this.router.get("/lastMessage", this.getDevicesMessage.bind(this));
    this.router.get("/lastMessage/:id", this.getDevicesMessageById.bind(this));
  }

  private async login(req: Request, res: Response) {
    const { username, password } = req.body;
    if (
      username === process.env.USERNAME &&
      password === process.env.PASSWORD
    ) {
      const user = { name: username };
      const accessToken = jsonwt.sign(user, process.env.JWT_SECRET!, {
        expiresIn: "1d",
      });
      res.json({ accessToken });
    } else {
      res.status(401).send("Username or password incorrect");
    }
  }

  private async getDevicesMessage(req: Request, res: Response) {
    let token = req.cookies["Velo.JWT"];

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).send("Unauthorized. 329");
    }

    logger.debug(`/IOT JWT ${token}`);

    const decoded = jsonwt.decode(token);

    if (Date.now() - decoded?.exp * 1000 > 0) {
      let link = "https://" + Constants.VELOPERA_HOST + "/login";
      req.url;
      logger.warn(
        "session expired! " +
          (Date.now() - decoded.exp * 1000 + " fwd to " + link)
      );
      return res.redirect(link);
    }

    try {
      const allDevicesStatus = getCachedMessage();
      res.json(allDevicesStatus);
    } catch (e) {
      logger.error("/IOT AUTH INTERNAL FAILURE [312] " + JSON.stringify(e));
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send("Internal Server Error");
    }
  }

  private async getDevicesMessageById(req: Request, res: Response) {
    let token = req.cookies["Velo.JWT"];

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).send("Unauthorized. 329");
    }

    logger.debug(`/IOT JWT ${token}`);

    const decoded = jsonwt.decode(token);

    if (Date.now() - decoded?.exp * 1000 > 0) {
      let link = "https://" + Constants.VELOPERA_HOST + "/login";
      req.url;
      logger.warn(
        "session expired! " +
          (Date.now() - decoded.exp * 1000 + " fwd to " + link)
      );
      return res.redirect(link);
    }

    const id = req.params.id;

    try {
      const deviceStatus = getCachedMessageById(id);
      if (deviceStatus) {
        res.json(deviceStatus);
      } else {
        res
          .status(StatusCodes.NOT_FOUND)
          .send("No device found with the specified Id");
      }
    } catch (e) {
      logger.error("/IOT AUTH INTERNAL FAILURE [312] " + JSON.stringify(e));
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send("Internal Server Error");
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
