// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

interface VatLike {
    function ilks(bytes32) external view returns (uint256, uint256, uint256, uint256, uint256);
    function urns(bytes32, address) external view returns (uint256, uint256);
    function grab(bytes32, address, address, address, int256, int256) external;
    function hope(address) external;
    function nope(address) external;
}

interface ClipLike {
    function kick(uint256, uint256, address, address) external returns (uint256);
}

interface VowLike {
    function fess(uint256) external;
}

// Dog - Liquidation Trigger
// This contract monitors collateralization ratios and initiates liquidations
// when positions become unsafe (undercollateralized)

contract Dog {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "Dog/not-authorized"); _; }

    // --- Data ---
    struct Ilk {
        ClipLike clip;  // Liquidator
        uint256  chop;  // Liquidation Penalty  [wad]
        uint256  hole;  // Max liquidation quantity [rad]
        uint256  dirt;  // Liquidated quantity [rad]
    }

    mapping (bytes32 => Ilk) public ilks;

    VatLike public vat;
    VowLike public vow;

    uint256 public live;   // Active flag
    uint256 public Hole;   // Total liquidation limit [rad]
    uint256 public Dirt;   // Total liquidated quantity [rad]

    // --- Events ---
    event Bark(
        bytes32 indexed ilk,
        address indexed urn, 
        uint256 ink,
        uint256 art,
        uint256 due,
        address clip,
        uint256 indexed id
    );

    // --- Init ---
    constructor(address vat_) {
        wards[msg.sender] = 1;
        vat = VatLike(vat_);
        live = 1;
    }

    // --- Math ---
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x <= y ? x : y;
    }
    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x);
    }
    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x);
    }
    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    // --- Administration ---
    function file(bytes32 what, address data) external auth {
        require(live == 1, "Dog/not-live");
        if (what == "vow") vow = VowLike(data);
        else revert("Dog/file-unrecognized-param");
    }
    
    function file(bytes32 what, uint256 data) external auth {
        require(live == 1, "Dog/not-live");
        if (what == "Hole") Hole = data;
        else revert("Dog/file-unrecognized-param");
    }
    
    function file(bytes32 ilk, bytes32 what, uint256 data) external auth {
        require(live == 1, "Dog/not-live");
        if (what == "chop") ilks[ilk].chop = data;
        else if (what == "hole") ilks[ilk].hole = data;
        else revert("Dog/file-unrecognized-param");
    }
    
    function file(bytes32 ilk, bytes32 what, address clip) external auth {
        require(live == 1, "Dog/not-live");
        if (what == "clip") {
            ilks[ilk].clip = ClipLike(clip);
        }
        else revert("Dog/file-unrecognized-param");
    }

    function chop(bytes32 ilk) external view returns (uint256) {
        return ilks[ilk].chop;
    }

    function cage() external auth {
        live = 0;
    }

    // --- CDP Liquidation ---
    function bark(bytes32 ilk, address urn, address kpr) external returns (uint256 id) {
        require(live == 1, "Dog/not-live");

        (uint256 ink, uint256 art) = vat.urns(ilk, urn);
        (, uint256 rate, uint256 spot, uint256 line, uint256 dust) = vat.ilks(ilk);
        uint256 tab = mul(art, rate);

        require(spot > 0 && mul(ink, spot) < tab, "Dog/not-unsafe");

        Ilk memory milk = ilks[ilk];
        uint256 room;
        {
            uint256 dart;
            uint256 dtab;
            uint256 dink;
            
            room = min(milk.hole, sub(Hole, Dirt));
            dart = min(art, mul(room, DSMath.WAD) / rate / milk.chop);
            dink = min(ink, mul(ink, dart) / art);
            dtab = mul(dart, rate);

            require(dtab > 0, "Dog/null-auction");
            require(dtab >= dust || (dtab == tab && tab > 0), "Dog/dusty-auction");

            vat.grab(ilk, urn, address(this), address(vow), -int256(dink), -int256(dart));

            uint256 due = mul(dtab, milk.chop) / DSMath.WAD;
            vow.fess(sub(due, dtab));

            {
                Dirt = add(Dirt, due);
                ilks[ilk].dirt = add(milk.dirt, due);
            }

            id = milk.clip.kick(tab, due, urn, kpr);

            emit Bark(ilk, urn, dink, dart, due, address(milk.clip), id);
        }
    }

    function digs(bytes32 ilk, uint256 rad) external auth {
        Dirt = sub(Dirt, rad);
        ilks[ilk].dirt = sub(ilks[ilk].dirt, rad);
    }

    function cage(bytes32 ilk) external auth {
        ilks[ilk].chop = DSMath.WAD;
        ilks[ilk].hole = 0;
        ilks[ilk].dirt = 0;
    }
}