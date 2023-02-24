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
		PlayerId: { type: "string" },
		SteamId: { type: "string" },
		DiscordId: { type: "string" }
	},
	required: ["Name", "Region", "PlayerId"],
	additionalProperties: false
})

const getPlayerId: ValidateFunction = ajv.compile({
	type: "object",
	properties: {
		Ids: {
			SteamId: { type: "string" },
			DiscordId: { type: "string" },
			type: "array"
		}
	},
	required: ["Ids"],
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
	AccountNotFound = 8,
	AccountAlreadyExists = 9
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

	if (!validator.isUUID(req.body.PlayerId)) valid = false

	if (valid) {
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
					"Result": ResponseResult.AccountNotFound
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

	if (!validator.isUUID(req.body.PlayerId)) valid = false

	if (valid) {

		// Add user to database and send back the new id.
		db.createUser(req.body.Name, req.body.Region, req.body.PlayerId, req.body.SteamId, req.body.DiscordId, (playerId: string) => {
			if (playerId) {
				res.send({
					"Result": ResponseResult.Success,
					"PlayerId": playerId
				})
			} else {
				res.send({
					"Result": ResponseResult.AccountAlreadyExists
				});
			}
		})
	} else {
		res.send({
			"Result": ResponseResult.RequestInvalid
		})
	}
})

// Request to get id of users.
app.get("/api/getPlayerId", (req: Request, res: Response) => {
	var valid = getPlayerId(req.body)
	if (valid) {

		// Loop through all the ids we're provided, check an account is registered on it, and when we reach the last one, send it.
		var playerIds: string[]
		var result: ResponseResult = ResponseResult.AccountNotFound
		for (let i = 0; i < req.body.Ids.length; i++) {
			db.getPlayerByNativeIds(req.body.Ids[i].SteamId, req.body.Ids[i].DiscordId, (playerId: string) => {
				if (playerId) {
					playerIds.push(playerId)
					result = ResponseResult.Success
				}
				else
				{
					playerIds.push("-1")
				}

				// If this is the last entry in our ids.
				if (i + 1 == req.body.Ids.length)
				{
					res.send({
						"Result": result,
						"PlayerIds": playerIds
					})
				}
			})
		}
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
						"Result": ResponseResult.AccountAlreadyExists
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
	console.log(`OpenHellion main server listening on port ${port}`)
})
