// Interfaces for User creation and retrieval processes

/**
 * Interface for user authorization request.
 */
export interface AuthorizeUserRequest {
  email: string;
  password: string;
}

/**
 * Interface for user creation request.
 * Includes all necessary fields for creating a new user account.
 */
export interface CreateUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

/**
 * Interface for Clerk registered user creation request.
 * Includes all necessary fields for creating a new Clerk registered user account.
 */
export interface CreateClerkUserRequest {
  userId: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Interface for the request to read a user's information.
 */
export interface ReadUserRequest {
  email: string;
  // user_id: string;
}

/**
 * General User interface for representing a user in the system.
 * This is typically used for responses where sensitive information is not included.
 */
export interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  // Additional fields can be included as necessary
}
