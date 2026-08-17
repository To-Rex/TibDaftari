/**
 * Repository provider. All repositories talk to the FastAPI backend (VITE_API_URL);
 * nothing above this layer knows about HTTP.
 */
import { httpRepositories } from './http'

export const repos = httpRepositories

export * from './repositories'
export { ApiError, absoluteUrl } from './http/client'
