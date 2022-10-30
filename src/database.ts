import {
  Document,
  Filter,
  MongoClient,
  OptionalId,
  UpdateFilter,
  WithId,
} from 'mongodb'

import { databaseConfig } from './config'

export default class DataBase {
  static connectionStr = databaseConfig.connectionStr

  static dbName = databaseConfig.dbName

  private client: MongoClient

  constructor() {
    this.client = new MongoClient(DataBase.connectionStr)
  }

  async find(collection: string, query = {}, options = {}) {
    let res: WithId<Document>[] = []
    try {
      await this.client.connect()

      const database = this.client.db(DataBase.dbName)
      const c = database.collection(collection)

      const cursor = c.find(query, options)
      res = await cursor.toArray()
    } finally {
      await this.client.close()
    }
    return res
  }

  async insert(collection: string, docs: OptionalId<Document>[], options = {}) {
    let res = null

    try {
      await this.client.connect()

      const database = this.client.db(DataBase.dbName)
      const c = database.collection(collection)

      res = await c.insertMany(docs, options)
    } finally {
      await this.client.close()
    }

    return res
  }

  async updateOne(
    collection: string,
    filter: Filter<Document>,
    updateDoc: Partial<Document> | UpdateFilter<Document>,
    options = {}
  ) {
    let res = null

    try {
      await this.client.connect()

      const database = this.client.db(DataBase.dbName)
      const c = database.collection(collection)

      res = await c.updateOne(filter, updateDoc, options)
    } finally {
      await this.client.close()
    }

    return res
  }

  async delete(collection: string, query: Filter<Document>) {
    let res = null

    try {
      await this.client.connect()

      const database = this.client.db(DataBase.dbName)
      const c = database.collection(collection)

      res = await c.deleteMany(query)
    } finally {
      await this.client.close()
    }

    return res
  }
}
