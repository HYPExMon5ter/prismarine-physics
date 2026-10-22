/* eslint-env mocha */
const assert = require('assert')
const { Vec3 } = require('vec3')
const { Physics, PlayerState } = require('../')

describe('version coverage', () => {
  for (const version of ['1.8.8', '1.13.2', '1.21.11', '26.1', '26.2', '26.3']) {
    it(`lands on a solid floor with finite state on ${version}`, () => {
      const registry = require('minecraft-data')(version)
      const Block = require('prismarine-block')(registry)
      const world = {
        getBlock: pos => {
          const block = Block.fromStateId(registry.blocksByName[pos.y < 60 ? 'stone' : 'air'].defaultState, 0)
          block.position = pos.floored()
          return block
        }
      }
      const physics = Physics(registry, world)
      const bot = {
        registry,
        entity: { position: new Vec3(0.5, 64, 0.5), velocity: new Vec3(0, 0, 0), yaw: 0, pitch: 0, effects: {}, attributes: {} },
        inventory: { slots: [] },
        jumpTicks: 0,
        jumpQueued: false
      }
      const controls = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }
      for (let i = 0; i < 100; i++) physics.simulatePlayer(new PlayerState(bot, controls), world).apply(bot)
      assert.strictEqual(bot.entity.onGround, true)
      assert.strictEqual(bot.entity.position.y, 60)
      assert.ok(Number.isFinite(bot.entity.velocity.y))
    })
  }
})
