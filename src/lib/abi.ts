export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'version', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'DOMAIN_SEPARATOR', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  {
    type: 'function', name: 'permit', stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

export const ERC4626_ABI = [
  ...ERC20_ABI,
  { type: 'function', name: 'asset', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'convertToShares', stateMutability: 'view', inputs: [{ name: 'assets', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'convertToAssets', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalAssets', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

export const STAKING_VAULT_ABI = [
  ...ERC4626_ABI,
  { type: 'function', name: 'getVerifiedNav', stateMutability: 'view', inputs: [], outputs: [{ name: 'nav', type: 'uint256' }] },
] as const;

export const MARKET_PARAMS_TUPLE = {
  name: 'marketParams',
  type: 'tuple',
  components: [
    { name: 'loanToken', type: 'address' },
    { name: 'collateralToken', type: 'address' },
    { name: 'oracle', type: 'address' },
    { name: 'irm', type: 'address' },
    { name: 'lltv', type: 'uint256' },
  ],
} as const;

export const MORPHO_ABI = [
  {
    type: 'function', name: 'idToMarketParams', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{ ...MARKET_PARAMS_TUPLE, name: '' }],
  },
  {
    type: 'function', name: 'market', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      { name: 'totalSupplyAssets', type: 'uint128' },
      { name: 'totalSupplyShares', type: 'uint128' },
      { name: 'totalBorrowAssets', type: 'uint128' },
      { name: 'totalBorrowShares', type: 'uint128' },
      { name: 'lastUpdate', type: 'uint128' },
      { name: 'fee', type: 'uint128' },
    ],
  },
  {
    type: 'function', name: 'position', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }, { name: 'user', type: 'address' }],
    outputs: [
      { name: 'supplyShares', type: 'uint256' },
      { name: 'borrowShares', type: 'uint128' },
      { name: 'collateral', type: 'uint128' },
    ],
  },
  {
    type: 'function', name: 'nonce', stateMutability: 'view',
    inputs: [{ name: 'authorizer', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function', name: 'isAuthorized', stateMutability: 'view',
    inputs: [{ name: 'authorizer', type: 'address' }, { name: 'authorized', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function', name: 'setAuthorizationWithSig', stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'authorization', type: 'tuple', components: [
          { name: 'authorizer', type: 'address' },
          { name: 'authorized', type: 'address' },
          { name: 'isAuthorized', type: 'bool' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      {
        name: 'signature', type: 'tuple', components: [
          { name: 'v', type: 'uint8' },
          { name: 'r', type: 'bytes32' },
          { name: 's', type: 'bytes32' },
        ],
      },
    ],
    outputs: [],
  },
] as const;

export const ORACLE_ABI = [
  { type: 'function', name: 'price', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

export const IRM_ABI = [
  {
    type: 'function', name: 'borrowRateView', stateMutability: 'view',
    inputs: [
      MARKET_PARAMS_TUPLE,
      {
        name: 'market', type: 'tuple', components: [
          { name: 'totalSupplyAssets', type: 'uint128' },
          { name: 'totalSupplyShares', type: 'uint128' },
          { name: 'totalBorrowAssets', type: 'uint128' },
          { name: 'totalBorrowShares', type: 'uint128' },
          { name: 'lastUpdate', type: 'uint128' },
          { name: 'fee', type: 'uint128' },
        ],
      },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export const BUNDLER3_ABI = [
  {
    type: 'function', name: 'multicall', stateMutability: 'payable',
    inputs: [{
      name: 'bundle', type: 'tuple[]', components: [
        { name: 'to', type: 'address' },
        { name: 'data', type: 'bytes' },
        { name: 'value', type: 'uint256' },
        { name: 'skipRevert', type: 'bool' },
        { name: 'callbackHash', type: 'bytes32' },
      ],
    }],
    outputs: [],
  },
  {
    type: 'function', name: 'reenter', stateMutability: 'nonpayable',
    inputs: [{
      name: 'bundle', type: 'tuple[]', components: [
        { name: 'to', type: 'address' },
        { name: 'data', type: 'bytes' },
        { name: 'value', type: 'uint256' },
        { name: 'skipRevert', type: 'bool' },
        { name: 'callbackHash', type: 'bytes32' },
      ],
    }],
    outputs: [],
  },
] as const;

export const GA1_ABI = [
  {
    type: 'function', name: 'erc20TransferFrom', stateMutability: 'nonpayable',
    inputs: [{ name: 'token', type: 'address' }, { name: 'receiver', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function', name: 'erc20Transfer', stateMutability: 'nonpayable',
    inputs: [{ name: 'token', type: 'address' }, { name: 'receiver', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function', name: 'erc4626Deposit', stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'assets', type: 'uint256' },
      { name: 'maxSharePriceE27', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'morphoSupplyCollateral', stateMutability: 'nonpayable',
    inputs: [
      MARKET_PARAMS_TUPLE,
      { name: 'assets', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'morphoBorrow', stateMutability: 'nonpayable',
    inputs: [
      MARKET_PARAMS_TUPLE,
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'minSharePriceE27', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'morphoRepay', stateMutability: 'nonpayable',
    inputs: [
      MARKET_PARAMS_TUPLE,
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'maxSharePriceE27', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'morphoWithdrawCollateral', stateMutability: 'nonpayable',
    inputs: [
      MARKET_PARAMS_TUPLE,
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'morphoFlashLoan', stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'assets', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export const CURVE_POOL_ABI = [
  {
    type: 'function', name: 'exchange_received', stateMutability: 'nonpayable',
    inputs: [
      { name: 'i', type: 'int128' },
      { name: 'j', type: 'int128' },
      { name: 'dx', type: 'uint256' },
      { name: 'min_dy', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function', name: 'get_dy', stateMutability: 'view',
    inputs: [
      { name: 'i', type: 'int128' },
      { name: 'j', type: 'int128' },
      { name: 'dx', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;
