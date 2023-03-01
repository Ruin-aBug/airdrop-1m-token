import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import MerkleTree from "merkletreejs";
import keccak256 from "keccak256";
import { expect } from "chai";

function encodeLeaf(address: string, spots: BigNumber) {
	return ethers.utils.defaultAbiCoder.encode(
		["address", "uint256"],
		[address, spots]
	)
}

describe("test airdrop", () => {

	async function deployContract() {
		const accounts = await ethers.getSigners();
		const amount = ethers.utils.parseEther("1");

		const list: string[] = [];
		// 构建Merkle树所有节点
		for (const account of accounts) {
			list.push(encodeLeaf(account.address, amount))
		}
		// 构建白名单Merkle树
		const merkleTree = new MerkleTree(list, keccak256, { hashLeaves: true, sortPairs: true });
		// 获取Merkle树根
		const merkleRoot = merkleTree.getHexRoot();

		const MingToken_Factory = await ethers.getContractFactory("MingToken");
		const Airdrop_Factory = await ethers.getContractFactory("Airdrop");
		// 部署Ming Token
		const mingToken = await MingToken_Factory.deploy();
		// 部署空投合约
		const airdrop = await Airdrop_Factory.deploy(mingToken.address, merkleRoot, amount);

		// 将100万Ming Token发生到空投合约
		const tx = await mingToken.transfer(airdrop.address, amount.mul(1000000));
		await tx.wait();

		return { amount, accounts, merkleTree, mingToken, airdrop }
	}

	describe("test withdraw airdrop", () => {
		it("withdraw airdrop", async () => {
			const { amount, accounts, merkleTree, mingToken, airdrop } = await loadFixture(deployContract);

			const leaf = keccak256(encodeLeaf(accounts[0].address, amount));
			const proof = merkleTree.getHexProof(leaf);

			const verified = await airdrop.checkInWhitelist(proof, accounts[0].address, amount);
			expect(verified).to.be.equal(true);

			const tx = await airdrop.withdrawAirdrop(proof);
			await tx.wait();

			const balanceOf = await mingToken.balanceOf(accounts[0].address);
			expect(balanceOf).to.be.equal(amount);
		})

		it("withdraw error", async () => {
			const { accounts, merkleTree, airdrop } = await loadFixture(deployContract);

			const amount = ethers.utils.parseEther("2");
			const leaf = keccak256(encodeLeaf(accounts[0].address, amount));
			const proof = merkleTree.getHexProof(leaf);

			const verified = await airdrop.checkInWhitelist(proof, accounts[0].address, amount);
			expect(verified).to.be.equal(false);

			expect(airdrop.withdrawAirdrop(proof)).to.be.rejectedWith("Error:Not in the whitelist");
		})
	})
})