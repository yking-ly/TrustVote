// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    address public admin;
    bool public votingOpen;
    uint256 public currentElectionId;
    
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }
    
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    mapping(uint256 => mapping(uint256 => Candidate)) private _candidates;
    mapping(uint256 => uint256) private _candidatesCount;
    
    event CandidateRegistered(uint256 id, string name, uint256 electionId);
    event VoteCast(address indexed voter, uint256 candidateId, uint256 electionId);
    event VotingStatusChanged(bool isOpen);
    event ElectionReset(uint256 newElectionId);

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

    constructor() {
        admin = msg.sender;
        votingOpen = false;
        currentElectionId = 1;
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

    function castVote(uint256 _candidateId) public onlyDuringVoting notAdmin {
        require(!_hasVoted[currentElectionId][msg.sender], "You have already voted");
        require(_candidateId > 0 && _candidateId <= _candidatesCount[currentElectionId], "Invalid candidate ID");
        
        _hasVoted[currentElectionId][msg.sender] = true;
        _candidates[currentElectionId][_candidateId].voteCount++;
        
        emit VoteCast(msg.sender, _candidateId, currentElectionId);
    }

    function candidatesCount() public view returns (uint256) {
        return _candidatesCount[currentElectionId];
    }

    function hasVoted(address _voter) public view returns (bool) {
        return _hasVoted[currentElectionId][_voter];
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
