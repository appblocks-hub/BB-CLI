/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { PathLike } from 'fs'
import { GitError } from '../errors/gitError'

export type GitVendors = 'github' | 'bitbucket'

export interface ExecResponse {
  out: string
}
export interface GitManagerConfig {
  gitVendor: GitVendors // git vendors
  remote: String // git url
  cwd: PathLike // git repository path
}


declare class GitManager<C extends GitManagerConfig> {
  constructor(config: C)

  /**
   * ================================================================================
   * ======================= Vendor specific git manager functions ===================
   * ================================================================================
   */

  /**
   * Log in user to the provided git vendor.
   */
  public login(): Promise<Error>

  /**
   * Log out user from the provided git vendor.
   */
  public disconnect(): Promise<Error>

  /**
   * Get a list of git user organizations.
   */
  public getOrganizations(): Promise<Error>

  /**
   * Get a list of git user repositories.
   */
  public getRepositories(): Promise<Error>

  /**
   * Get details of a specific repository.
   */
  public getRepository(): Promise<Error>

  /**
   * Check if a repository name is available.
   */
  public checkRepositoryNameAvailability(): Promise<Error>

  /**
   * Create a new repository.
   */
  public createRepository(): Promise<Error>

  /**
   * Update an existing repository.
   */
  public updateRepository(): Promise<Error>

  /**
   * Clone a repository.
   */
  public cloneRepository(): Promise<Error>

  /**
   * Create a new pull request.
   */
  public createPullRequest(): Promise<Error>

  /**
   * Fork a repository.
   */
  public forkRepository(): Promise<Error>

  /**
   * ================================================================================
   * ========================== Local git manager functions ==========================
   * ================================================================================
   */

  /**
   * Add a remote to git.
   */
  addRemote(remoteName: string, parentRepo: string): Promise<ExecResponse | GitError>

  /**
   * Commit changes in git.
   */
  commit(message: string, ...opts: string): Promise<ExecResponse | GitError>

  /**
   * Clone a git repository.
   */
  clone(destination: string): Promise<ExecResponse | GitError>

  /**
   * Sparse clone a git repository.
   */
  sparseClone(destination: string): Promise<ExecResponse | GitError>

  /**
   * Sparse checkout a git repository.
   */
  sparseCheckout(cmd: string, optionsArray: string[]): Promise<ExecResponse | GitError>

  /**
   * Read git tree.
   */
  readTree(): Promise<ExecResponse | GitError>

  /**
   * Initialize a new git repository.
   */
  init(): Promise<ExecResponse | GitError>

  /**
   * Checkout a branch.
   */
  checkoutBranch(branchName: string): Promise<ExecResponse | GitError>

  /**
   * Get a list of commits in a branch.
   */
  getCommits(branchName: string, n: string): Promise<ExecResponse | GitError>

  /**
   * Check out a remote branch.
   */
  checkRemoteBranch(branchName: string): Promise<ExecResponse | GitError>

  /**
   * Find the default branch of the repository.
   */
  findDefaultBranch(): Promise<string | null | GitError>

  /**
   * Checkout a tag with a branch.
   */
  checkoutTag(tag: string, branch: string): Promise<ExecResponse | GitError>

  /**
   * Checkout a tag without a branch.
   */
  checkoutTagWithNoBranch(tag: string): Promise<ExecResponse | GitError>

  /**
   * Undo checkout in git.
   */
  undoCheckout(): Promise<ExecResponse | GitError>

  /**
   * Change the git directory.
   */
  cd(directoryPath: PathLike): Promise<ExecResponse | GitError>

  /**
   * Create a release branch.
   */
  createReleaseBranch(releaseBranch: string, parentBranch: string): Promise<ExecResponse | GitError>

  /**
   * Fetch from a git repository.
   */
  fetch(fetchOptions: string): Promise<ExecResponse | GitError>

  /**
   * Get the global user name for Git commits.
   */
  getGlobalUsername(): Promise<ExecResponse | GitError>

  /**
   * Merge changes from one branch into the current branch.
   */
  merge(from: string, ...opts: string): Promise<ExecResponse | GitError>

  /**
   * Create a new branch.
   */
  newBranch(branchName: string): Promise<ExecResponse | GitError>

  /**
   * Create a new orphan branch (a branch without any history).
   */
  newOrphanBranch(branchName: string): Promise<ExecResponse | GitError>

  /**
   * Rename a branch.
   */
  renameBranch(newBranchName: string): Promise<ExecResponse | GitError>

  /**
   * Pull changes from the remote repository into the current branch.
   */
  pull(): Promise<ExecResponse | GitError>

  /**
   * Pull changes from a specific branch of the remote repository.
   */
  pullBranch(upstreamBranch: string): Promise<ExecResponse | GitError>

  /**
   * Get the name of the current branch.
   */
  currentBranch(): Promise<ExecResponse | GitError>

  /**
   * Show the difference between the working directory and index (staging area).
   */
  diff(): Promise<ExecResponse | GitError>

  /**
   * Push changes to the remote repository.
   */
  push(upstreamBranch: string): Promise<ExecResponse | GitError>

  /**
   * Push tags to the remote repository.
   */
  pushTags(): Promise<ExecResponse | GitError>

  /**
   * Add a new tag to the current commit.
   */
  addTag(tag: string, message: string): Promise<ExecResponse | GitError>

  /**
   * Remove a remote repository.
   */
  removeRemote(remoteName: string): Promise<ExecResponse | GitError>

  /**
   * Remove tags from the repository.
   */
  removeTags(tags: string): Promise<ExecResponse | GitError>

  /**
   * Stage all changes in the working directory.
   */
  stageAll(): Promise<ExecResponse | GitError>

  /**
   * Get the status of the repository (modified files, staged files, etc.).
   */
  status(): Promise<ExecResponse | GitError>

  /**
   * Get the status of the repository with specific options.
   */
  statusWithOptions(...opts: string): Promise<ExecResponse | GitError>

  /**
   * Set the upstream branch and push changes to the remote repository.
   */
  setUpstreamAndPush(upstreamBranch: string): Promise<ExecResponse | GitError>

  /**
   * Set the local username for Git commits.
   */
  setLocalUsername(name: string): Promise<ExecResponse | GitError>

  /**
   * Set the global username for Git commits.
   */
  setGlobalUsername(name: string): Promise<ExecResponse | GitError>

  /**
   * Set the local user email for Git commits.
   */
  setLocalUserEmail(email: string): Promise<ExecResponse | GitError>

  /**
   * Set the global user email for Git commits.
   */
  setGlobalUserEmail(email: string): Promise<ExecResponse | GitError>

  /**
   * Get the commit information associated with a tag.
   */
  revListTag(tag: string): Promise<ExecResponse | GitError>

  /**
   * Execute a helper function to run node exec.
   */
  async _run(operation: string, opts: string[]): Promise<ExecResponse | GitError>

  // ============================================ //
}
