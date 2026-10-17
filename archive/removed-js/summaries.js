/* Noeti Boards — board overviews written from the imported KiCad data */
(function () {
  'use strict';
  const N = window.Noeti;
  const S = {
    'anyon-e/motherboard': {
      text: 'Carrier board for the anyon_e laptop. A CM3588 (RK3588) compute module mates at J1, and the carrier fans it out to eDP, M.2 PCIe 3.0 (M-key) and PCIe 2.0 (E-key), SD card, a CH334F USB 2.0 hub (U20), two USB-C ports with FUSB302 PD controllers (U7, U13) and a TPA2016D2 audio amp (U19). Three TPS564257 bucks (U2–U4) make the main rails on a 6-layer, 133 × 92 mm board.',
      q: ['What does each TPS564257 buck (U2, U3, U4) supply, and where can I probe its output?', 'How do the USB-C ports negotiate power through U7 and U13?', 'The M.2 SSD is not detected. What should I check first?'],
    },
    'anyon-e/power': {
      text: 'Power board for the laptop: a HUSB238 USB-C PD sink (U1) feeds a BQ25713 buck-boost charger (U4) with BQ7791501 cell protection (U3) and an LTC2943 fuel gauge (U2). The charger, gauge and PD sink share one I2C bus that is also broken out on J5, and an ESP32-S3-MINI-1 module (U5) sits beside them. 64 × 45 mm, 4 layers.',
      q: ['Walk me through the power path from USB-C to the battery.', 'The laptop will not charge from USB-C. What should I measure around U4?', 'Which parts sit on the shared I2C bus, and what are their roles?'],
    },
    'anyon-e/keyboard': {
      text: 'Full-width keyboard for the laptop (262 × 110 mm, 2 layers). An nRF52840 (U2) scans a diode-isolated key matrix, a BQ21040 (U1) charges its cell and an ESDR0502N (U3) guards the USB lines.',
      q: ['How is the key matrix scanned: which nRF52840 pins drive rows and columns?', 'A whole row of keys is dead. How do I narrow it down?', 'What sets the BQ21040 charge current?'],
    },
    'anyon-e/audio': {
      text: 'USB audio module: a CM108 codec (U1) drives two TPA2028 class-D amplifiers (U2, U4), and a CH32V003 microcontroller (U3) talks to both amps over the shared SDA/SCL bus. 28 × 22 mm, 2 layers.',
      q: ['How does the CH32V003 configure the TPA2028 amplifiers?', 'One speaker is silent. What should I probe?', 'What powers the amplifiers and how is it decoupled?'],
    },
    'anyon-e/display_eval': {
      text: 'Bring-up adapter for the laptop display: the 40-pin I-PEX 20455 panel connector (J1) is routed to an HDMI-style receptacle carrying DisplayPort (J4), with a Molex connector (J3), a panel power header (J2) and a debug header (J5).',
      q: ['Which signals go from the panel connector J1 to J4?', 'How is panel power brought in on J2?', 'What are test points TP12 and TP13 for?'],
    },
    'anyon-e/display_eval_short': {
      text: 'Compact version of the display adapter: the 40-pin I-PEX panel connector (J1) goes straight to an SMD HDMI-style receptacle carrying DisplayPort (J4), with headers for panel power (J2) and debug (J5).',
      q: ['Which signals go from J1 to J4?', 'How does this differ from the full display_eval board?', 'Where would I probe the panel supply?'],
    },
    'anyon-e/switch': {
      text: 'Power-button board: a push button (SW1), two power LEDs (D1, D2) with their resistors, and a 3-pin 1.27 mm connector (J1) back to the laptop.',
      q: ['How are the LEDs and the button wired to J1?', 'The power LED never lights. What should I check?', 'Why is the /ON_LED net important here?'],
    },
    'anyon-e/encoder': {
      text: 'Angle-sensor board for the haptic knob: an MT6701 magnetic encoder (U1) on a 12 × 12 mm, 2-layer board.',
      q: ['What does the MT6701 output and on which pins?', 'How should the magnet sit above U1?', 'What decoupling does U1 have?'],
    },
    'glasgow/glasgow/revC3': {
      text: 'Glasgow revC3 pairs a Cypress FX2LP USB microcontroller (U1) with an iCE40HX8K FPGA (U30). Its two 8-pin I/O banks go through SN74LVC1T45 level shifters, each bank with a DAC-set LDO (DAC081C081 + TPS73101) and an INA233 current monitor, and a TPD3S014 (U15) limits USB current. 80 × 49 mm, 4 layers.',
      q: ['How does the FX2LP (U1) configure the iCE40 FPGA (U30)?', 'Bank A I/O voltage stays at 0 V. What sets it and where do I probe?', 'What protects the I/O pins when the target is powered and Glasgow is not?'],
    },
    'glasgow/glasgow': {
      text: 'Next-generation Glasgow: an ECP5 LFE5U-25F FPGA (U8) with two Xccela octal PSRAMs (U11, U12), an FX2LP USB controller (U2), a NAFE71388 universal analog front end (U7), USB-C power via a FUSB302 (U4) and a TPS259472 eFuse (U5), and 74AXP1T45 level shifters on every I/O. 95 × 55 mm, 6 layers.',
      q: ['How is power sequenced from USB-C through U5 to the FPGA rails?', 'What does the NAFE71388 (U7) measure, and how does it reach the FPGA?', 'Which rails have no test point, and where else could I probe them?'],
    },
    'hackrf/hackrf-one': {
      text: 'HackRF One, a half-duplex SDR from 1 MHz to 6 GHz. The RFFC5072 mixer/synthesizer (U4) and MAX2837 transceiver (U17) sit behind SKY13453 and SKY13317 RF switches and MGA-81563 amplifiers; a MAX5864 (U18) converts to baseband for the LPC4320 MCU (U23) and CoolRunner-II CPLD (U24), and a Si5351C (U19) clocks it all. 120 × 75 mm, 4 layers.',
      q: ['How does the Si5351C (U19) clock the MAX5864 and the LPC4320?', 'Receive works but transmit is weak above 2.7 GHz. Which RF path should I check?', 'What does the TPS62410 (U21) supply?'],
    },
    'bus-pirate/bus-pirate/6-REV2B': {
      text: 'Bus Pirate 6: an RP2350B (U1) drives eight buffered I/O pins through AiP74LVC1T45 level shifters (U301–U308), with a programmable supply (VREF_VOUT) and current limit, a CD4067 analog mux (U402) for voltage readings, SPI NAND storage (U105) and a 74LVC8T245 (U2) buffer. 60 × 60 mm, 4 layers.',
      q: ['How is the programmable supply VREF_VOUT generated and current-limited?', 'One I/O pin reads the wrong level. Which parts sit between the connector and U1?', 'How does the RP2350B read voltages through U402?'],
    },
    'bus-pirate/bus-pirate/5XL-REV0': {
      text: 'Bus Pirate 5XL: the Bus Pirate 5 layout reworked around a QFN-60 microcontroller footprint (U103) with a TLV74311 LDO (U1). Eight I/O pins go through AiP74LVC1T45 level shifters (U301–U308), with 74HC595 shift registers (U501, U502), a CD4067 mux (U402) and SPI NAND (U105). 80 × 80 mm, 4 layers.',
      q: ['What changed between the 5 and the 5XL?', 'How do the 74HC595 shift registers (U501, U502) control the buffers?', 'Where do I measure the 3.3 V rail and what feeds it?'],
    },
    'bus-pirate/bus-pirate/5-REV10A': {
      text: 'Bus Pirate 5 REV10A: an RP2040 (U103) with W25Q128 flash (U102) drives eight I/O pins through AiP74LVC1T45 level shifters (U301–U308), controlled by 74HC595 shift registers (U501, U502), with a CD4067 mux (U402), LMV321/LMV324 comparators and op-amps, and SPI NAND (U105). 80 × 80 mm, 4 layers.',
      q: ['How does the RP2040 control the eight I/O buffers?', 'The programmable supply will not turn on. What should I check?', 'What do the LMV324 op-amps (U504, U505) do?'],
    },
    'rp2040-guide/rp2040-guide': {
      text: 'Minimal RP2040 reference design: the RP2040 (U3) boots from a W25Q128 QSPI flash (U1) with a 12 MHz crystal (Y1), a USBLC6-2 (U2) protects the USB-C data lines, and an XC6206 LDO (U4) makes 3.3 V. The RP2040’s own regulator makes +1V1. Two layers, 45 × 93 mm.',
      q: ['What is the minimum circuit the RP2040 needs to boot from flash?', 'The board does not enumerate over USB. What should I check?', 'What do the 27 Ω resistors on the USB lines do?'],
    },
  };
  N.summaryFor = function (repo, board, version) {
    return S[`${repo}/${board}/${version}`] || S[`${repo}/${board}`] || null;
  };
})();
