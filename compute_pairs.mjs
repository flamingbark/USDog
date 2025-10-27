import { keccak256, getAddress, solidityPacked } from "ethers";

function pairFor(factory, tokenA, tokenB, initCodeHash){
  const [token0, token1] = (BigInt(tokenA) < BigInt(tokenB)) ? [tokenA, tokenB] : [tokenB, tokenA];
  const salt = keccak256(solidityPacked(["address","address"],[token0, token1]));
  const raw = keccak256(solidityPacked(["bytes1","address","bytes32","bytes32"],["0xff", factory, salt, initCodeHash]));
  const addr = getAddress("0x" + raw.slice(26));
  return addr;
}

const factory = getAddress('0xca143ce32fe78f1f7019d7d551a6402fc5350c73');
const initCodeHash = '0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5';
const WBNB = getAddress('0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c');
const DOGE = getAddress('0xba2ae424d960c26247dd6c32edc70b295c744c43');
const SHIB = getAddress('0x2859e4544c4bb03966803b044a93563bd2d0dd4d');

console.log('DOGE-WBNB:', pairFor(factory, DOGE, WBNB, initCodeHash));
console.log('SHIB-WBNB:', pairFor(factory, SHIB, WBNB, initCodeHash));

