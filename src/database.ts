import * as sqlite3 from "sqlite3"
import { randomUUID } from "crypto"

sqlite3.verbose()
const db = new sqlite3.Database(":memory:", (err) => {
	if (err == null) {
		db.run("CREATE TABLE users (id TEXT, name TEXT, steam_id INT, discord_id INT, last_signin TEXT, last_server_id INT)")
		db.run("CREATE TABLE servers (id TEXT, ip_address TEXT, port INT, hash INT, region INT)")
	}
})

function getUser(id: number, callback: Function) {
	db.get("SELECT * FROM users WHERE id = $id", { $id: id }, (err, row) => {
		if (err) {
			console.log("Error:", err.message)
			callback(null)
			return
		}
		callback(row)
	})
}

function getServer(callback: Function) {
	db.get("SELECT * FROM servers", (err, row) => {
		if (err) {
			console.log("Error:", err.message)
			callback(null)
			return
		}
		callback(row)
	})
}

function createUser(name: string, region: number, steamId: number, discordId: number, callback: Function) {
	// Check if user already exists.
	db.get("SELECT * FROM users WHERE steam_id = $steamId OR discord_id = $discordId", {
		$steamId: steamId,
		$discordId: discordId }, (err: any, row: any) => {

		if (err) {
			console.log("Error:", err.stack)
			callback(null)
			return
		}

		if (row) {
			console.log("User already exists with ids:", steamId, discordId)
			callback(null)
			return
		}

		// Generate an id we will use for the user indefinitely.
		var userId: string = randomUUID()
	
		// Add user to database.
		db.run("INSERT INTO users (id, name, steam_id, discord_id) VALUES ($userId, $name, $steamId, $discordId)", {
			$userId: userId,
			$name: name,
			$steamId: steamId,
			$discordId: discordId },(err: any) => {
			if (err) {
				console.log(err.stack)
				return
			}
	
			callback(userId)
		})
	})
}

function createServer(ipAddress: string, port: number, region: number, hash: number, callback: Function) {
	// Check if server already exists.
	db.get("SELECT * FROM servers WHERE ip_address = $ipAddress AND port = $port", {
		$ipAddress: ipAddress,
		$port: port }, (err: any, row: any) => {

		if (err) {
			console.log("Error:", err.stack)
			callback(null)
			return
		}

		if (row) {
			console.log("Server with ip already exists:", ipAddress + ":" + port)
			callback(null)
			return
		}

		// Generate an id we will use for the user indefinitely.
		var serverId: string = randomUUID()
	
		// Add user to database.
		db.run("INSERT INTO servers (id, ip_address, port, hash, region) VALUES ($serverId, $ipAddress, $port, $hash, $region)", {
			$serverId: serverId,
			$ipAddress: ipAddress,
			$port: port,
			$hash: hash,
			$region: region
		},(err: any) => {
			if (err) {
				console.log(err.stack)
				return
			}
	
			callback(serverId)
		})
	})
}

function close() {
	db.close()
}

export {
	getUser,
	getServer,
	createUser,
	createServer,
	close,
	db
}
