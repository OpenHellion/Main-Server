import validator from "validator"

import Ajv, { ValidateFunction } from "ajv"
const ajv = new Ajv()

import express, { Express, Request, Response } from "express"
const app: Express = express()
const port: number = 6001

import * as db from "./src/database"

const signInRequest: ValidateFunction = ajv.compile({
	type: "object",
	properties: {
		PlayerId: { type: "string" },
		Version: { type: "string" },
		Hash: { type: "integer" },
		JoiningId: { type: "integer" }
	},
	required: ["PlayerId", "Version", "Hash"],
	additionalProperties: false
})

const createUserRequest: ValidateFunction = ajv.compile({
	type: "object",
	properties: {
		Name: { type: "string" },
		Region: { type: "integer" },
		SteamId: { type: "string" },
		DiscordId: { type: "string" }
	},
	required: ["Name", "Region"],
	additionalProperties: false
})

const getPlayerId: ValidateFunction = ajv.compile({
	type: "object",
	properties: {
		SteamId: { type: "string" },
		DiscordId: { type: "string" }
	},
	additionalProperties: false
})

const publishServerRequest: ValidateFunction = ajv.compile({
	type: "object",
	properties: {
		Region: { type: "integer" },
		GamePort: { type: "integer" },
		StatusPort: { type: "integer" },
		Hash: { type: "integer" }
	},
	required: ["Region", "GamePort", "Hash"],
	additionalProperties: false
})

enum ResponseResult {
	Success = 0,
	Error = 1,
	WrongPassword = 3,
	AlreadyLoggedInError = 4,
	ClientVersionError = 5,
	ServerNotFound = 6,
	RequestInvalid = 7,
	UserNotFound = 8,
	UserAlreadyExists = 9
}

enum Region {
	Europe = 0,
	Africa = 4,
	WestAsia = 5,
	EastAsia = 7,
	America = 8
}

app.use(express.json())

app.use('/api', function(req, res, next) {
	console.log(req.body)
	next();
});

// Main function for the api. Sign in, and return a server to connect to.
app.get('/api/signin', (req: Request, res: Response) => {
	var valid = signInRequest(req.body)
	if (valid) {
		if (!validator.isUUID(req.body.PlayerId)) {
			res.send({
				"Result": ResponseResult.RequestInvalid
			})
			return
		}

		// TODO: Validate version, and hash.

		// Responds with a server to connect to.
		db.getUser(req.body.PlayerId, (user: any) => {
			if (user) {

				// TODO: Select nearest server.
				db.getRandomServer((server: any) => {
					if (server) {
						res.send({
							"Result": ResponseResult.Success,
							"Server": {
								"Id": server.id,
								"IpAddress": server.ip_address,
								"GamePort": server.game_port,
								"StatusPort": server.status_port,
								"Hash": server.hash,
								"Region": server.region
							},
							"LastSignIn": user.last_signin
						})
					} else {
						res.send({
							"Result": ResponseResult.ServerNotFound
						})
					}
				})
			} else {
				res.send({
					"Result": ResponseResult.UserNotFound
				})
			}
		})
	} else {
		res.send({
			"Result": ResponseResult.RequestInvalid
		})
	}
})

// Request to create a new user.
app.get("/api/createPlayer", (req: Request, res: Response) => {
	var valid = createUserRequest(req.body)
	if (valid) {

		// Add user to database and send back the new id.
		db.createUser(req.body.Name, req.body.Region, req.body.SteamId, req.body.DiscordId, (playerId: string) => {
			if (playerId) {
				res.send({
					"Result": ResponseResult.Success,
					"PlayerId": playerId
				})
			} else {
				res.send({
					"Result": ResponseResult.UserAlreadyExists
				});
			}
		})
	} else {
		res.send({
			"Result": ResponseResult.RequestInvalid
		})
	}
})

// Request to create a new user.
app.get("/api/getPlayerId", (req: Request, res: Response) => {
	var valid = getPlayerId(req.body)
	if (valid) {

		// Try to find user with either discord or steam id and send back the new id.
		db.getPlayerByNativeIds(req.body.SteamId, req.body.DiscordId, (playerId: string) => {
			if (playerId) {
				res.send({
					"Result": ResponseResult.Success,
					"PlayerId": playerId
				})
			} else {
				res.send({
					"Result": ResponseResult.UserNotFound
				});
			}
		})
	} else {
		res.send({
			"Result": ResponseResult.RequestInvalid
		})
	}
})

// Request to add a new server to our list of servers.
app.get("/api/checkIn", (req: Request, res: Response) => {
	var valid = publishServerRequest(req.body)

	var ip:string = req.ip

	// Check if ip is valid.
	if (!validator.isIP(ip)) {
		valid = false
	}

	if (ip === "::1")
	{
		ip = "localhost"
	}

	// TODO: Add quality checks.

	// If everything is valid.
	if (valid) {

		// TODO: Check hash.

		if (req.body.ServerId)
		{
			// Server already exists, so just get that.
			db.getServer(req.body.ServerId, (server: any) => {
				if (server) {
					res.send({
						"Result": ResponseResult.Success,
						"ServerId": server.id
					})
				} else {
					res.send({
						"Result": ResponseResult.ServerNotFound
					});
				}
			})
		} else {
			
			// Server doesn't exist so we need to add it to the database.
			db.createServer(ip, req.body.GamePort, req.body.StatusPort, req.body.Region, req.body.Hash, (serverId: string) => {
				if (serverId) {
					res.send({
						"Result": ResponseResult.Success,
						"ServerId": serverId
					})
				} else {
					res.send({
						"Result": ResponseResult.UserAlreadyExists
					});
				}
			})
		}
	} else {
		res.send({
			"Result": ResponseResult.RequestInvalid
		})
	}
})

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})
