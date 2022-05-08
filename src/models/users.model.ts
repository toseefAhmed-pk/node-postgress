import { PoolClient, QueryResult } from "pg"

import Client from "../database/database"
import bcrypt from "bcrypt"
import { User } from "../interfaces/users.interface"

import { NOT_FOUND, OK } from "http-status-codes"
import { DataObject } from "../interfaces/common.interface"

export class UserModel {
  async authenticate(username: string, password: string): Promise<DataObject> {
   
    try {
      const sql =
        "SELECT * FROM users WHERE username=$1"
      const conn: PoolClient = await Client.connect()

      const result: QueryResult<User> = await conn.query(sql, [username])
      const { rows } = result

      if (rows.length > 0) {
        const pepper: string = process.env.PASSWORD_HASH as string
       
        const user: User = rows[0]
        //console.log(user); 
        if (bcrypt.compareSync(password+pepper, user.password_digest)) {
          const result: DataObject = {
            status: OK,
            data: user,
          }
          return result
        }
        else {
          const error: DataObject = {
            status: NOT_FOUND,
            data: "Incorrect Password",
          }
          return error
        }
        
        
      }

      
      const error: DataObject = {
        status: NOT_FOUND,
        data: "No User found with this Username",
      }
      return error

    } catch (error) {
      throw new Error(`Not found, ${error}`)
    }
  }

  async index(): Promise<DataObject> {
    try {
      const conn: PoolClient = await Client.connect()
      const sql = "SELECT id, username, firstname, lastname FROM users"
      const result: QueryResult<User> = await conn.query(sql)
      conn.release()

      const data: DataObject = {
        status: result.rows.length > 0 ? OK : NOT_FOUND,
        data:
          result.rows.length > 0 ? result.rows : { error: "No Records found" },
      }
      return data
    } catch (error) {
      throw new Error(`Unable to find Results: ${error}`)
    }
  }

  async create(user: User): Promise<DataObject> {
    try {
      const conn = await Client.connect()

      const sql =
        "INSERT INTO users (username, password_digest, firstname, lastname) VALUES ($1, $2, $3, $4) RETURNING id, username, firstname, lastname"
      const pepper: string = process.env.PASSWORD_HASH as string

      const hashSteps = process.env.SALT_ROUNDS as string
      const hash = bcrypt.hashSync(
        user.password_digest + pepper,
        parseInt(hashSteps)
      )

      console.log(hash);

      const result: QueryResult<User> = await conn.query(sql, [
        user.username,
        hash,
        user.firstname,
        user.lastname,
      ])

      conn.release()

      const obj: DataObject = {
        status: result.rows.length > 0 ? OK : NOT_FOUND,
        data:
          result.rows.length > 0
            ? result.rows[0]
            : { error: "Unable to Create" },
      }
      return obj
    } catch (error) {
      throw new Error(`Unable to find Results: ${error}`)
    }
  }

  async show(id: number): Promise<DataObject> {
    try {
      const sql =
        "SELECT id, username, firstname, lastname FROM users WHERE id=$1"
      const conn: PoolClient = await Client.connect()

      const result: QueryResult<User> = await conn.query(sql, [id])
      conn.release()

      const data: DataObject = {
        status: result.rows.length > 0 ? OK : NOT_FOUND,
        data:
          result.rows.length > 0
            ? result.rows[0]
            : { error: "No Records found" },
      }
      return data
    } catch (error) {
      throw new Error(`Unable to find Results: ${error}`)
    }
  }

  async delete(id: number): Promise<DataObject> {
    try {
      const sql =
        "DELETE FROM users WHERE id=$1 RETURNING id, username, firstname, lastname"
      const conn: PoolClient = await Client.connect()
      const result: QueryResult<User> = await conn.query(sql, [id])

      conn.release()

      const data: DataObject = {
        status: result.rows.length > 0 ? OK : NOT_FOUND,
        data:
          result.rows.length > 0
            ? result.rows[0]
            : { error: "No Records found" },
      }
      return data
    } catch (error) {
      throw new Error(`Unable to Delete: ${error}`)
    }
  }

  async update(id: number, user: JSON): Promise<DataObject> {
    const keys: string = Object.keys(user).join(",")
    const values: string[] = Object.values(user)

    const indices: string = Object.keys(user)
      .map((obj, index) => {
        return "$" + (index + 1)
      })
      .join(",")

    const sql = `UPDATE users SET (${keys})=(${indices}) WHERE id=${id} RETURNING id, username, firstname, lastname`

    try {
      const conn: PoolClient = await Client.connect()
      const result: QueryResult<User> = await conn.query(sql, values)

      conn.release()
      const obj: DataObject = {
        status: result.rows.length > 0 ? OK : NOT_FOUND,
        data:
          result.rows.length > 0
            ? result.rows[0]
            : { error: "No Records found" },
      }
      return obj
    } catch (error) {
      throw new Error(`Unable to Update: ${error}`)
    }
  }

  async clean(): Promise<boolean> {
    const sql = "TRUNCATE TABLE users RESTART IDENTITY CASCADE"
    try {
      const conn: PoolClient = await Client.connect()
      await conn.query(sql)

      conn.release()

      return true
    } catch (error) {
      throw new Error(`Unable to Update: ${error}`)
    }
  }
}
