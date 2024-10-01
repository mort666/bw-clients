/** Request key parameters for sshkey credential generation.
 *  Length may only be specified for rsa keys.
 */
export type SshKeyGenerationOptions = {
  /** The length of the (rsa) key selected by the user in bits. */
  bits?: number;

  /** The key type selected by the user. */
  keyAlgorithm?: "rsa" | "ed25519";
};
