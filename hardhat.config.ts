import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  typechain: {
    alwaysGenerateOverloads: true,
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
};

export default config;
