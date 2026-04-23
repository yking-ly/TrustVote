// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract Voting {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public admin;
    address public backendSigner; // Trusted backend address that signs vote authorizations after OTP
    bool public votingOpen;
    uint256 public currentElectionId;

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    // Track votes by phone hash (keccak256 of phone number) per election
    mapping(uint256 => mapping(bytes32 => bool)) private _hasVotedPhone;
    mapping(uint256 => mapping(uint256 => Candidate)) private _candidates;
    mapping(uint256 => uint256) private _candidatesCount;

    event CandidateRegistered(uint256 id, string name, uint256 electionId);
    event VoteCast(bytes32 indexed phoneHash, uint256 candidateId, uint256 electionId);
    event VotingStatusChanged(bool isOpen);
    event ElectionReset(uint256 newElectionId);
    event BackendSignerUpdated(address newSigner);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyDuringVoting() {
        require(votingOpen, "Voting is not currently open");
        _;
    }

    modifier notAdmin() {
        require(msg.sender != admin, "Admin cannot cast a vote");
        _;
    }

    constructor(address _backendSigner) {
        require(_backendSigner != address(0), "Backend signer cannot be zero address");
        admin = msg.sender;
        backendSigner = _backendSigner;
        votingOpen = false;
        currentElectionId = 1;
    }

    /// @notice Update the trusted backend signer address
    function setBackendSigner(address _signer) public onlyAdmin {
        require(_signer != address(0), "Signer cannot be zero address");
        backendSigner = _signer;
        emit BackendSignerUpdated(_signer);
    }

    function addCandidate(string memory _name) public onlyAdmin {
        _candidatesCount[currentElectionId]++;
        uint256 cCount = _candidatesCount[currentElectionId];
        _candidates[currentElectionId][cCount] = Candidate(cCount, _name, 0);
        emit CandidateRegistered(cCount, _name, currentElectionId);
    }

    function setVotingStatus(bool _isOpen) public onlyAdmin {
        if (_isOpen) {
            require(_candidatesCount[currentElectionId] >= 2, "Need at least 2 candidates to start");
        }
        votingOpen = _isOpen;
        emit VotingStatusChanged(_isOpen);
    }

    function resetElection() public onlyAdmin {
        require(!votingOpen, "Close voting before resetting election");
        currentElectionId++;
        emit ElectionReset(currentElectionId);
    }

    /// @notice Cast a vote with backend-signed OTP authorization
    /// @param _candidateId The ID of the candidate to vote for
    /// @param _phoneHash keccak256 hash of the voter's phone number
    /// @param _signature Backend's ECDSA signature of (phoneHash, candidateId, electionId)
    function castVote(
        uint256 _candidateId,
        bytes32 _phoneHash,
        bytes calldata _signature
    ) public onlyDuringVoting notAdmin {
        // 1. Ensure this phone hasn't voted in this election
        require(!_hasVotedPhone[currentElectionId][_phoneHash], "This phone number has already voted!");
        require(_candidateId > 0 && _candidateId <= _candidatesCount[currentElectionId], "Invalid candidate ID");

        // 2. Reconstruct the message the backend should have signed
        bytes32 messageHash = keccak256(
            abi.encodePacked(_phoneHash, _candidateId, currentElectionId)
        );

        // 3. Verify the signature was produced by our trusted backend signer
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(_signature);
        require(recovered == backendSigner, "Invalid backend authorization signature");

        // 4. Record the vote
        _hasVotedPhone[currentElectionId][_phoneHash] = true;
        _candidates[currentElectionId][_candidateId].voteCount++;

        // 5. Emit event with phone hash (preserves anonymity — no raw phone on-chain)
        emit VoteCast(_phoneHash, _candidateId, currentElectionId);
    }

    function candidatesCount() public view returns (uint256) {
        return _candidatesCount[currentElectionId];
    }

    function hasVoted(bytes32 _phoneHash) public view returns (bool) {
        return _hasVotedPhone[currentElectionId][_phoneHash];
    }

    function getCandidate(uint256 _candidateId) public view returns (uint256, string memory, uint256) {
        require(_candidateId > 0 && _candidateId <= _candidatesCount[currentElectionId], "Invalid candidate ID");
        Candidate memory c = _candidates[currentElectionId][_candidateId];
        return (c.id, c.name, c.voteCount);
    }

    function getAllCandidates() public view returns (Candidate[] memory) {
        uint256 cCount = _candidatesCount[currentElectionId];
        Candidate[] memory allCandidates = new Candidate[](cCount);
        for (uint256 i = 1; i <= cCount; i++) {
            allCandidates[i - 1] = _candidates[currentElectionId][i];
        }
        return allCandidates;
    }
}
