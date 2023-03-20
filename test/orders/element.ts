import { ElementData, OrderSignature, ERC721SellOrder } from '../../src/entities/protocols/element-market'

export const elementOrderETH: ERC721SellOrder = {
  maker: '0xABd6a19345943dD175026Cdb52902FD3392a3262',
  taker: '0x75B6568025f463a98fB01082eEb6dCe04efA3Ae4',
  expiry: '7199994275163324196',
  nonce: '3',
  erc20Token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  erc20TokenAmount: '55000000000000000',
  fees: [],
  nft: '0x4C69dBc3a2Aa3476c3F7a1227ab70950DB1F4858',
  nftId: '998',
}

export const elementSignatureETH: OrderSignature = {
  signatureType: 0,
  v: 27,
  r: '0x59ceb2bc0e21029209e6cfa872b1224631b01da3e19d25fad9b929b8be4e6f60',
  s: '0x72cadb8ed8a5bf5938829f888ff60c9ebe163954dc15af3e5d6014e8f6801b83',
}

export const elementDataETH: ElementData = {
  order: elementOrderETH,
  signature: elementSignatureETH,
}
