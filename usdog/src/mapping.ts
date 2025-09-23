import { LogNote } from "../generated/Vat/Vat";
import { Bark } from "../generated/Dog/Dog";
import { Transfer } from "../generated/StableCoin/StableCoin";
import { Kick } from "../generated/templates/Clip/Clip";
import { log } from "@graphprotocol/graph-ts";

export function handleLogNote(event: LogNote): void {
  log.info("Handled LogNote for Vat", []);
}

export function handleBark(event: Bark): void {
  log.info("Handled Bark for Dog", []);
}

export function handleTransfer(event: Transfer): void {
  log.info("Handled Transfer for StableCoin", []);
}

export function handleKick(event: Kick): void {
  log.info("Handled Kick for Clip", []);
}