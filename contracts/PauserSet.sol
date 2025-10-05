// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PauserSet
 * @notice Manages a set of addresses authorized to pause contracts
 * @dev Immutable contract that stores pauser addresses
 */
contract PauserSet {
    // Array of pauser addresses
    address[] private pausers;

    // Mapping for O(1) lookup
    mapping(address => bool) private isPauserMap;

    // Events
    event PauserAdded(address indexed pauser);

    // Errors
    error NoPausersProvided();
    error ZeroAddress();

    /**
     * @notice Constructor
     * @param _pausers Array of pauser addresses
     */
    constructor(address[] memory _pausers) {
        if (_pausers.length == 0) revert NoPausersProvided();

        for (uint256 i = 0; i < _pausers.length; i++) {
            if (_pausers[i] == address(0)) revert ZeroAddress();

            pausers.push(_pausers[i]);
            isPauserMap[_pausers[i]] = true;

            emit PauserAdded(_pausers[i]);
        }
    }

    /**
     * @notice Check if an address is a pauser
     * @param account Address to check
     * @return bool True if the address is a pauser
     */
    function isPauser(address account) external view returns (bool) {
        return isPauserMap[account];
    }

    /**
     * @notice Get all pauser addresses
     * @return address[] Array of all pausers
     */
    function getPausers() external view returns (address[] memory) {
        return pausers;
    }

    /**
     * @notice Get the number of pausers
     * @return uint256 Number of pausers
     */
    function getPauserCount() external view returns (uint256) {
        return pausers.length;
    }

    /**
     * @notice Get a pauser by index
     * @param index Index of the pauser
     * @return address The pauser address
     */
    function getPauserAt(uint256 index) external view returns (address) {
        require(index < pausers.length, "Index out of bounds");
        return pausers[index];
    }
}
