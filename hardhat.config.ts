import dotenv from 'dotenv'
dotenv.config()

export default {
  paths: {
    sources: './contracts',
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      chainId: 1,
      forking: {
        url: `${process.env.FORK_URL}`,
        blockNumber: 15360000,
      },
    },
  },
  mocha: {
    timeout: 60000,
  },
}
