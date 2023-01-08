import validator from "validator"

import Ajv, { ValidateFunction } from "ajv"
const ajv = new Ajv()

import express, { Express, Request, Response } from "express"
const app: Express = express()
const port: number = 6000

import * as db from "./src/database"

const signInRequest: ValidateFunction = ajv.compile({
	type: "object",
	properties: {
		userId: { type: "string" },
		version: { type: "string" },
		hash: { type: "integer" },
		joiningId: { type: "integer" },
		steamId: { type: "integer" },
		discordId: { type: "integer" }
	},
	required: ["userId", "version", "hash"],
	additionalProperties: false
})

const createUserRequest: ValidateFunction = ajv.compile({
	type: "object",
	properties: {
		name: { type: "string" },
		region: { type: "integer" },
		steamId: { type: "integer" },
		discordId: { type: "integer" }
	},
	required: ["name", "region"],
	additionalProperties: false
})

const publishServerRequest: ValidateFunction = ajv.compile({
	type: "object",
	properties: {
		region: { type: "integer" },
		ipAddress: { type: "string" },
		port: { type: "integer" },
		hash: { type: "integer" }
	},
	required: ["region", "ipAddress", "port", "hash"],
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

var activeUsers:number[] = []

app.use(express.json())

app.use('/api', function(req, res, next) {
	next();
});

// Main function for the api. Sign in, and return a server to connect to.
app.get('/api/signin', (req: Request, res: Response) => {
	var valid = signInRequest(req.body)
	if (valid) {
		if (!validator.isUUID(req.body.userId)) {
			res.send({
				"result": ResponseResult.RequestInvalid
			})
			return
		}

		if (activeUsers.includes(req.body.userId)) {
			res.send({
				"result": ResponseResult.AlreadyLoggedInError
			})
			return
		}

		// TODO: Validate version, and hash.

		// Responds with a server to connect to.
		db.getUser(req.body.userId, (user: any) => {
			if (user) {
				activeUsers.push(req.body.userId)

				// TODO: Select nearest server.
				db.getServer((server: any) => {
					if (server) {
						res.send({
							"result": ResponseResult.Success,
							"server": {
								"id": server.id,
								"ipAddress": server.ip_address,
								"port": server.port,
								"hash": server.hash,
								"region": server.region
							},
							"lastSignIn": user.last_signin
						})
					} else {
						res.send({
							"result": ResponseResult.ServerNotFound
						})
					}
				})
			} else {
				res.send({
					"result": ResponseResult.UserNotFound
				})
			}
		})
	} else {
		res.send({
			"result": ResponseResult.RequestInvalid,
			"error": signInRequest.errors
		})
	}
})

// Request to create a new user.
app.post("/api/createUser", (req: Request, res: Response) => {
	var valid = createUserRequest(req.body)
	if (valid) {

		// Add user to database and send back the new id.
		db.createUser(req.body.name, req.body.region, req.body.steamId, req.body.discordId, (userId: string) => {
			if (userId) {
				res.send({
					"result": ResponseResult.Success,
					"userId": userId
				})
			} else {
				res.send({
					"result": ResponseResult.UserAlreadyExists
				});
			}
		})
	} else {
		res.send({
			"result": ResponseResult.RequestInvalid
		})
	}
})

// Request to add a new server to our list of servers.
app.post("/api/publishServer", (req: Request, res: Response) => {
	var valid = publishServerRequest(req.body)

	// Check if ip is valid.
	if (valid && !validator.isIP(req.body.ipAddress)) {
		valid = false
	}

	// TODO: Add quality checks.

	// If everything is valid.
	if (valid) {

		// TODO: Check hash.

		// Add server to database and send back the new server id.
		db.createServer(req.body.ipAddress, req.body.port, req.body.region, req.body.hash, (serverId: string) => {
			if (serverId) {
				res.send({
					"result": ResponseResult.Success,
					"serverId": serverId
				})
			} else {
				res.send({
					"result": ResponseResult.UserAlreadyExists
				});
			}
		})
	} else {
		res.send({
			"result": ResponseResult.RequestInvalid
		})
	}
})

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})
