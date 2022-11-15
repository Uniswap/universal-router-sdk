import {
  NARWHAL_ADDRESS as MAINNET_NARWHAL_ADDRESS,
  PERMIT2_ADDRESS as MAINNET_PERMIT2_ADDRESS,
} from '../../src/utils/constants'

export const PERMIT2_ADDRESS =
  process.env.USE_MAINNET_DEPLOYMENT == 'true' ? '0x4a873bdd49f7f9cc0a5458416a12973fab208f8d' : MAINNET_PERMIT2_ADDRESS
// narwhal address in tests
export const NARWHAL_ADDRESS =
  process.env.USE_MAINNET_DEPLOYMENT === 'true' ? '0xe808c1cfeebb6cb36b537b82fa7c9eef31415a05' : MAINNET_NARWHAL_ADDRESS
