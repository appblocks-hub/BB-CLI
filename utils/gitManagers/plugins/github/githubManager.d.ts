/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { PathLike } from 'fs'
import { GitManager, GitManagerConfig } from '../../gitManager'

export type Organization = any

export type Repository = any

export interface ConnectOptions {
  force: boolean
}

declare class GithubManager<C extends GitManagerConfig> extends GitManager {
  constructor(config: C)

  /**
   * Log in user to the github.
   * @param options - Connect options.
   */
  public connect(options: ConnectOptions): Promise<void>

  /**
   * Log out user from the github.
   */
  public disconnect(): Promise<void>

  /**
   * Get a list of git user organizations.
   */
  public getOrganizations(): Promise<Organization[]>

  /**
   * Get a list of git user repositories.
   */
  public getRepositories(): Promise<Repository[]>

  /**
   * Get details of a specific repository.
   */
  public getRepository(): Promise<Repository>

  /**
   * Check if a repository name is available.
   */
  public checkRepositoryNameAvailability(): Promise<boolean>

  /**
   * Create a new repository.
   */
  public createRepository(): Promise<Repository>

  /**
   * Update an existing repository.
   */
  public updateRepository(): Promise<Repository>

  /**
   * Clone a repository.
   */
  public cloneRepository(): Promise<Repository>

  /**
   * Create a new pull request.
   */
  public createPullRequest(): Promise<Repository>

  /**
   * Fork a repository.
   */
  public forkRepository(): Promise<Repository>

  /**
   * Set or Update github local config
   */
  public setConfig(key: string, value: any): Promise<void>

  /**
   * Delete github local config
   */
  public deleteConfig(keys: string[]): Promise<void>

  /**
   * To refresh github local config to manager
   */
  public refreshConfig(): Promise<void>
}

export = GithubManager
