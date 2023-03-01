// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Airdrop {
    using SafeERC20 for IERC20;

    IERC20 public mingToken;

    // 100万EOA地址的默克尔树根
    bytes32 public merkleRoot;
    // 每个地址固定空投token数量
    uint256 public amount;

    mapping (address => bool) public isWithdrawed;

    event WithdrawAirdrop(address account, uint256 amount);

    constructor(address _mingToken, bytes32 _merkleRoot, uint256 _amount) {
        mingToken = IERC20(_mingToken);
        merkleRoot = _merkleRoot;
        amount = _amount;
    }

    function withdrawAirdrop(bytes32[] calldata proof) external {
        bool inWhitelist = checkInWhitelist(proof,msg.sender, amount);
        require(inWhitelist, "Error:Not in the whitelist");
        require(!isWithdrawed[msg.sender], "Error: Withdrawed");
        mingToken.safeTransfer(msg.sender, amount);
        isWithdrawed[msg.sender] = true;
        emit WithdrawAirdrop(msg.sender, amount);
    }

    function checkInWhitelist(
        bytes32[] calldata proof,
        address account,
        uint256 maxAllowanceToMint
    ) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encode(account, maxAllowanceToMint));
        bool verifier = MerkleProof.verify(proof, merkleRoot, leaf);
        return verifier;
    }
}
