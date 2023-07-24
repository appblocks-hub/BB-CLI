/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { PathLike } from 'fs'

export type GitVendors = 'github' | 'bitbucket'

export interface GitManagerConfig {
  gitVendor: GitVendors // git vendors
  remote: String // git url
  cwd: PathLike // git repository path
}

export interface LoginOptions {
  force: boolean
}

declare class GitManager<C extends GitManagerConfig> {
  constructor(config: C)

  /**
   * To login user to provided git vendor
   * @param options
   */
  public login(options: LoginOptions): Promise<void>

  /**
   * To logout user from provided git vendor
   */
  public disconnect(): Promise<void>

  /**
   * To get list of git vendor organizer
   */
  async getOrganizations() {}

  // async getRepositories() {}
  // async getRepository() {}
  // async checkRepositoryNameAvailability() {}
  // async createRepository() {}
  // async updateRepository() {}
  // async cloneRepository() {}
  // async createPullRequest() {}
  // addRemote() {}
  // commit() {}
  // clone() {}
  // sparseClone() {}
  // sparseCheckout() {}
  // readTree() {}
  // init() {}
  // checkoutBranch() {}
  // getCommits() {}
  // checkRemoteBranch() {}
  // checkoutTag() {}
  // checkoutTagWithNoBranch() {}
  // undoCheckout() {}
  // cd() {}
  // createReleaseBranch() {}
  // fetch() {}
  // getGlobalUsername() {}
  // merge() {}
  // newBranch() {}
  // newOrphanBranch() {}
  // renameBranch() {}
  // pull() {}
  // pullBranch() {}
  // currentBranch() {}
  // diff() {}
  // push() {}
  // pushTags() {}
  // addTag() {}
  // removeRemote() {}
  // removeTags() {}
  // stageAll() {}
  // status() {}
  // statusWithOptions() {}
  // setUpstreamAndPush() {}
  // setLocalUsername() {}
  // setGlobalUsername() {}
  // setLocalUserEmail() {}
  // setGlobalUserEmail() {}
  // revListTag() {}
  // async findDefaultBranch() {}
  // async _run() {}

  config: C
}

// Existing function using github graphql in bb cli

// IdentifyUniqueBlockName - isRepoNameAvailable
// test - isRepoNameAvailable

// tempMigrate - isInRepo
// setVisibilityAndDefaultBranch - isInRepo (default branch)

// updateRepoName - updateRepository
// updateRepo - updateRepository

// createPrMutation - createPullRequest

// createRepo - cloneTemplateRepository
// createRepo & createRepoV2 - createRepository

// getGithubSignedInUser - viewer

// lx - list and select repo
