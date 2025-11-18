// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEPrivyJobs
 * @notice Stores encrypted job identifiers for users applying to a position.
 *         Each wallet can register exactly one encrypted job ID.
 */
contract FHEPrivyJobs is SepoliaConfig {
    /// @dev Mapping of applicant address to its encrypted job identifier.
    mapping(address => euint32) private _jobCipher;

    /// @dev Flags indicating whether a user has already submitted an encrypted job ID.
    mapping(address => bool) private _isRegistered;

    /// @dev Emitted whenever a user submits their encrypted job ID.
    event EncryptedJobStored(address indexed applicant);

    /**
     * @notice Submit an encrypted job ID for application.
     * @param encryptedJob  The FHE-encrypted uint32 representing the job ID.
     * @param zkProof       Zero-knowledge proof required for the encrypted input.
     *
     * @dev Converts external encrypted data into internal FHE value,
     *      stores it, and authorizes both the sender and this contract
     *      to decrypt or operate on it if needed.
     */
    function submitEncryptedJob(externalEuint32 encryptedJob, bytes calldata zkProof) external {
        require(!_isRegistered[msg.sender], "Job ID already submitted");

        euint32 internalCipher = FHE.fromExternal(encryptedJob, zkProof);
        _jobCipher[msg.sender] = internalCipher;

        // Grant decryption permission to both sender & contract
        FHE.allow(internalCipher, msg.sender);
        FHE.allowThis(internalCipher);

        _isRegistered[msg.sender] = true;

        emit EncryptedJobStored(msg.sender);
    }

    /**
     * @notice Check if a user has already provided an encrypted job ID.
     * @param user Address to check.
     * @return True if the user previously submitted an encrypted job ID.
     */
    function isJobSubmitted(address user) external view returns (bool) {
        return _isRegistered[user];
    }

    /**
     * @notice Retrieve the encrypted job ID associated with a specific user.
     * @param user The applicant address.
     * @return The stored euint32 encrypted job identifier.
     */
    function getEncryptedJob(address user) external view returns (euint32) {
        return _jobCipher[user];
    }
}
