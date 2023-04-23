import { api } from "./worker.worker"
import { wrap, transfer } from "comlink"
import eventListener from "../eventListener"
import type { ItemProps } from "../../types"
import { WORKER_THREADS } from "../constants"
import { logout } from "../services/user/logout"
import db from "../db"

let nextWorkerId: number = -1

const workerInstances: Worker[] = []
const workerAPIs: typeof api[] = []

const getWorkerAPI = () => {
	if (workerAPIs.length < WORKER_THREADS) {
		const workerInstance = new Worker(new URL("./worker.worker", import.meta.url))
		const workerAPI = wrap<typeof api>(workerInstance)

		workerInstance.onmessage = message => {
			if (typeof message.data?.type == "string") {
				if (message.data.type == "uploadProgress") {
					eventListener.emit("uploadProgress", message.data)
				}

				if (message.data.type == "downloadProgress") {
					eventListener.emit("downloadProgress", message.data)
				}
			}
		}

		workerInstances.push(workerInstance)
		workerAPIs.push(workerAPI)
	}

	nextWorkerId += 1

	if (nextWorkerId >= workerAPIs.length) {
		nextWorkerId = 0
	}

	return workerAPIs[nextWorkerId]
}

export const apiRequest = async ({
	method = "POST",
	endpoint,
	data,
	apiKey
}: {
	method: string
	endpoint: string
	data?: any
	apiKey?: string | null | undefined
}): Promise<any> => {
	const dbAPIKey = typeof apiKey === "string" ? apiKey : await db.get("apiKey")
	const response = await getWorkerAPI().apiRequest(method, endpoint, data, dbAPIKey)

	if (typeof response == "object") {
		if (typeof response.message == "string") {
			if (
				response.message.toLowerCase().indexOf("api key not found") !== -1 ||
				response.message.toLowerCase().indexOf("invalid api key") !== -1
			) {
				logout()

				throw new Error("Session invalidated")
			}
		}
	}

	return response
}

export const generatePasswordAndMasterKeysBasedOnAuthVersion = async (
	rawPassword: string,
	authVersion: number,
	salt: string
): Promise<{ derivedMasterKeys: string; derivedPassword: string }> => {
	return await getWorkerAPI().generatePasswordAndMasterKeysBasedOnAuthVersion(rawPassword, authVersion, salt)
}

export const deriveKeyFromPassword = async (
	password: string,
	salt: string,
	iterations: number,
	hash: string,
	bitLength: number,
	returnHex: boolean
): Promise<string | ArrayBuffer> => {
	return await getWorkerAPI().deriveKeyFromPassword(password, salt, iterations, hash, bitLength, returnHex)
}

export const hashPassword = async (password: string): Promise<string> => {
	//old and deprecated, no longer in use
	return await getWorkerAPI().hashPassword(password)
}

export const hashFn = async (str: string): Promise<string> => {
	return await getWorkerAPI().hashFn(str)
}

export const decryptMetadata = async (data: string, key: string): Promise<string> => {
	return await getWorkerAPI().decryptMetadata(data, key)
}

export const decryptFolderName = async (metadata: string, masterKeys: string[]): Promise<string> => {
	return await getWorkerAPI().decryptFolderName(metadata, masterKeys)
}

export const decryptFileMetadata = async (
	metadata: string,
	masterKeys: string[]
): Promise<{ name: string; size: number; mime: string; key: string; lastModified: number }> => {
	return await getWorkerAPI().decryptFileMetadata(metadata, masterKeys)
}

export const generateKeypair = async (): Promise<{ publicKey: string; privateKey: string }> => {
	return await getWorkerAPI().generateKeypair()
}

export const encryptMetadata = async (data: string, key: string): Promise<string> => {
	return await getWorkerAPI().encryptMetadata(data, key)
}

export const importPrivateKey = async (privateKey: string, mode: KeyUsage[] = ["decrypt"]): Promise<CryptoKey> => {
	return await getWorkerAPI().importPrivateKey(privateKey, mode)
}

export const decryptFolderNamePrivateKey = async (data: string, privateKey: string): Promise<string> => {
	return await getWorkerAPI().decryptFolderNamePrivateKey(data, privateKey)
}

// Promise<{ name: string, size: number, mime: string, key: string, lastModified: number }>
export const decryptFileMetadataPrivateKey = async (data: string, privateKey: string): Promise<any> => {
	return await getWorkerAPI().decryptFileMetadataPrivateKey(data, privateKey)
}

export const encryptData = async (data: Uint8Array, key: string): Promise<string | Uint8Array> => {
	return await getWorkerAPI().encryptData(transfer(data, [data.buffer]), key)
}

export const encryptAndUploadFileChunk = async (
	chunk: Uint8Array,
	key: string,
	url: string,
	uuid: string,
	chunkIndex: number,
	chunkSize: number
): Promise<any> => {
	return await getWorkerAPI().encryptAndUploadFileChunk(transfer(chunk, [chunk.buffer]), key, url, uuid, chunkIndex, chunkSize)
}

export const encryptMetadataPublicKey = async (data: string, publicKey: string): Promise<string> => {
	return await getWorkerAPI().encryptMetadataPublicKey(data, publicKey)
}

export const importPublicKey = async (publicKey: string, mode: KeyUsage[] = ["encrypt"]): Promise<CryptoKey> => {
	return await getWorkerAPI().importPublicKey(publicKey, mode)
}

export const decryptFolderLinkKey = async (metadata: string, masterKeys: string[]): Promise<string> => {
	return await getWorkerAPI().decryptFolderLinkKey(metadata, masterKeys)
}

export const decryptData = async (data: Uint8Array, key: string, version: number): Promise<Uint8Array> => {
	return await getWorkerAPI().decryptData(transfer(data, [data.buffer]), key, version)
}

export const downloadAndDecryptChunk = async (item: ItemProps, url: string): Promise<Uint8Array> => {
	return await getWorkerAPI().downloadAndDecryptChunk(item, url)
}

export const decryptFolderNameLink = async (metadata: string, linkKey: string): Promise<string> => {
	return await getWorkerAPI().decryptFolderNameLink(metadata, linkKey)
}

export const decryptFileMetadataLink = async (metadata: string, linkKey: string): Promise<any> => {
	return await getWorkerAPI().decryptFileMetadataLink(metadata, linkKey)
}

export const convertHeic = async (buffer: Uint8Array, format: "JPEG" | "PNG"): Promise<Uint8Array> => {
	return await getWorkerAPI().convertHeic(transfer(buffer, [buffer.buffer]), format)
}

export const bufferToHash = async (buffer: Uint8Array, algorithm: "SHA-1" | "SHA-256" | "SHA-512" | "SHA-384"): Promise<string> => {
	return await getWorkerAPI().bufferToHash(buffer, algorithm)
}
