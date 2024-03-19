import { ChainId, Token } from '@uniswap/sdk-core'
import { BigNumber } from 'ethers'

type ChainConfig = {
  router: string
  creationBlock: number
  weth: string
}

const WETH_NOT_SUPPORTED_ON_CHAIN = '0x0000000000000000000000000000000000000000'

const CHAIN_CONFIGS: { [key: number]: ChainConfig } = {
  // mainnet
  [1]: {
    router: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    creationBlock: 17143817,
  },
  // goerli
  [5]: {
    router: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    weth: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    creationBlock: 8940568,
  },
  // sepolia
  [11155111]: {
    router: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    creationBlock: 3543575,
  },
  // polygon
  [137]: {
    router: '0xec7BE89e9d109e7e3Fec59c222CF297125FEFda2',
    weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    creationBlock: 52210153,
  },
  //polygon mumbai
  [80001]: {
    router: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    weth: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
    creationBlock: 35176052,
  },
  //optimism
  [10]: {
    router: '0xCb1355ff08Ab38bBCE60111F1bb2B784bE25D7e8',
    weth: '0x4200000000000000000000000000000000000006',
    creationBlock: 114702266,
  },
  // optimism goerli
  [420]: {
    router: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    weth: '0x4200000000000000000000000000000000000006',
    creationBlock: 8887728,
  },
  // arbitrum
  [42161]: {
    router: '0x5E325eDA8064b456f4781070C0738d849c824258',
    weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    creationBlock: 169472836,
  },
  // arbitrum goerli
  [421613]: {
    router: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    weth: '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
    creationBlock: 18815277,
  },
  // celo
  [42220]: {
    router: '0x643770e279d5d0733f21d6dc03a8efbabf3255b4',
    weth: WETH_NOT_SUPPORTED_ON_CHAIN,
    creationBlock: 21407637,
  },
  // celo alfajores
  [44787]: {
    router: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    weth: WETH_NOT_SUPPORTED_ON_CHAIN,
    creationBlock: 17566658,
  },
  // binance smart chain
  [56]: {
    router: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265',
    weth: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    creationBlock: 35160263,
  },
  // avalanche
  [43114]: {
    router: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265',
    weth: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    creationBlock: 40237257,
  },
  // base goerli
  [84531]: {
    router: '0xd0872d928672ae2ff74bdb2f5130ac12229cafaf',
    weth: '0x4200000000000000000000000000000000000006',
    creationBlock: 6915289,
  },
  // base mainnet
  [8453]: {
    router: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    weth: '0x4200000000000000000000000000000000000006',
    creationBlock: 9107268,
  },
  [81457]: {
    router: '0xe463635f6e73C1E595554C3ae216472D0fb929a9',
    weth: '0x4300000000000000000000000000000000000004',
    creationBlock: 401447,
  },
}

export const WRAPPED_NATIVE_CURRENCY: { [chainId in ChainId]: Token } = {
  [ChainId.MAINNET]: new Token(
    1,
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.GOERLI]: new Token(
    5,
    '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.SEPOLIA]: new Token(
    11155111,
    '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.BNB]: new Token(
    56,
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    18,
    'WBNB',
    'Wrapped BNB'
  ),
  [ChainId.OPTIMISM]: new Token(
    ChainId.OPTIMISM,
    '0x4200000000000000000000000000000000000006',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.OPTIMISM_GOERLI]: new Token(
    ChainId.OPTIMISM_GOERLI,
    '0x4200000000000000000000000000000000000006',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.OPTIMISM_SEPOLIA]: new Token(
    ChainId.OPTIMISM_SEPOLIA,
    '0x4200000000000000000000000000000000000006',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.ARBITRUM_ONE]: new Token(
    ChainId.ARBITRUM_ONE,
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.ARBITRUM_GOERLI]: new Token(
    ChainId.ARBITRUM_GOERLI,
    '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.ARBITRUM_SEPOLIA]: new Token(
    ChainId.ARBITRUM_SEPOLIA,
    '0xc556bAe1e86B2aE9c22eA5E036b07E55E7596074',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.POLYGON]: new Token(
    ChainId.POLYGON,
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    18,
    'WMATIC',
    'Wrapped MATIC'
  ),
  [ChainId.POLYGON_MUMBAI]: new Token(
    ChainId.POLYGON_MUMBAI,
    '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
    18,
    'WMATIC',
    'Wrapped MATIC'
  ),

  // The Celo native currency 'CELO' implements the erc-20 token standard
  [ChainId.CELO]: new Token(
    ChainId.CELO,
    '0x471EcE3750Da237f93B8E339c536989b8978a438',
    18,
    'CELO',
    'Celo native asset'
  ),
  [ChainId.CELO_ALFAJORES]: new Token(
    ChainId.CELO_ALFAJORES,
    '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
    18,
    'CELO',
    'Celo native asset'
  ),
  [ChainId.GNOSIS]: new Token(
    ChainId.GNOSIS,
    '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
    18,
    'WXDAI',
    'Wrapped XDAI on Gnosis'
  ),
  [ChainId.MOONBEAM]: new Token(
    ChainId.MOONBEAM,
    '0xAcc15dC74880C9944775448304B263D191c6077F',
    18,
    'WGLMR',
    'Wrapped GLMR'
  ),
  [ChainId.AVALANCHE]: new Token(
    ChainId.AVALANCHE,
    '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    18,
    'WAVAX',
    'Wrapped AVAX'
  ),
  [ChainId.BASE]: new Token(
    ChainId.BASE,
    '0x4200000000000000000000000000000000000006',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.BASE_GOERLI]: new Token(
    ChainId.BASE_GOERLI,
    '0x4200000000000000000000000000000000000006',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.ROOTSTOCK]: new Token(
    ChainId.ROOTSTOCK,
    '0x542fDA317318eBF1d3DEAf76E0b632741A7e677d',
    18,
    'WRBTC',
    'Wrapped BTC'
  ),
  [ChainId.ZORA]: new Token(
    ChainId.ZORA,
    '0x4200000000000000000000000000000000000006',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.ZORA_SEPOLIA]: new Token(
    ChainId.ZORA_SEPOLIA,
    '0x4200000000000000000000000000000000000006',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.BLAST]: new Token(
    ChainId.BLAST,
    '0x4300000000000000000000000000000000000004',
    18,
    'WETH',
    'Wrapped Ether'
  ),
};

export const SUPPORTED_CHAINS = Object.keys(CHAIN_CONFIGS).map((chainId) => parseInt(chainId))

export const UNIVERSAL_ROUTER_ADDRESS = (chainId: number): string => {
  if (!(chainId in CHAIN_CONFIGS)) throw new Error(`Universal Router not deployed on chain ${chainId}`)
  return CHAIN_CONFIGS[chainId].router
}

export const UNIVERSAL_ROUTER_CREATION_BLOCK = (chainId: number): number => {
  if (!(chainId in CHAIN_CONFIGS)) throw new Error(`Universal Router not deployed on chain ${chainId}`)
  return CHAIN_CONFIGS[chainId].creationBlock
}

export const WETH_ADDRESS = (chainId: number): string => {
  if (!(chainId in CHAIN_CONFIGS)) throw new Error(`Universal Router not deployed on chain ${chainId}`)

  if (CHAIN_CONFIGS[chainId].weth == WETH_NOT_SUPPORTED_ON_CHAIN) throw new Error(`Chain ${chainId} does not have WETH`)

  return CHAIN_CONFIGS[chainId].weth
}

export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

export const CONTRACT_BALANCE = BigNumber.from(2).pow(255)
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1)
export const MAX_UINT160 = BigNumber.from(2).pow(160).sub(1)

export const SENDER_AS_RECIPIENT = '0x0000000000000000000000000000000000000001'
export const ROUTER_AS_RECIPIENT = '0x0000000000000000000000000000000000000002'

export const OPENSEA_CONDUIT_SPENDER_ID = 0
export const SUDOSWAP_SPENDER_ID = 1
