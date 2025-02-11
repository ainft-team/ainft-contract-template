import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-chai-matchers';
import 'solidity-coverage';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';

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
