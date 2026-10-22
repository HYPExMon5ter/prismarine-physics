/* eslint-env mocha */
const assert = require('assert')
const { Vec3 } = require('vec3')
const { Physics, PlayerState } = require('../')

// Block speed factors and ladder trapdoors are unchanged in the latest releases
// (Entity.getBlockSpeedFactor, LivingEntity.trapdoorUsableAsLadder in 26.3).
describe('features of current releases', () => {
  for (const version of ['1.16.5', '1.20.4', '1.21.11', '26.3']) {
    const registry = require('minecraft-data')(version)
    const Block = require('prismarine-block')(registry)

    function simulate (blockAt, position, controls, ticks, onGround = true) {
      const world = {
        getBlock: pos => {
          const block = blockAt(pos.floored())
          block.position = pos.floored()
          return block
        }
      }
      const physics = Physics(registry, world)
      const bot = {
        registry,
        entity: { position, velocity: new Vec3(0, 0, 0), yaw: 0, pitch: 0, effects: {}, attributes: {}, onGround },
        inventory: { slots: [] },
        jumpTicks: 0,
        jumpQueued: false
      }
      const input = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false, ...controls }
      for (let i = 0; i < ticks; i++) physics.simulatePlayer(new PlayerState(bot, input), world).apply(bot)
      return bot.entity
    }

    it(`slows walking on soul sand on ${version}`, () => {
      const walk = floor => simulate(
        pos => Block.fromStateId(registry.blocksByName[pos.y < 60 ? floor : 'air'].defaultState, 0),
        new Vec3(0.5, 60, 0.5), { forward: true }, 40).position.z
      const onStone = Math.abs(walk('stone'))
      const onSoulSand = Math.abs(walk('soul_sand'))
      assert.ok(onSoulSand < onStone * 0.6, `soul sand ${onSoulSand} vs stone ${onStone}`)
    })

    it(`climbs an open trapdoor above a ladder on ${version}`, () => {
      const ladder = Block.fromProperties('ladder', { facing: 'north', waterlogged: false }, 0)
      const trapdoor = Block.fromProperties('oak_trapdoor', { facing: 'north', open: true, half: 'bottom', powered: false, waterlogged: false }, 0)
      const air = Block.fromStateId(registry.blocksByName.air.defaultState, 0)
      const stone = Block.fromStateId(registry.blocksByName.stone.defaultState, 0)
      const blockAt = pos => {
        if (pos.y < 60) return stone
        if (pos.x !== 0 || pos.z !== 0) return air
        if (pos.y === 60) return ladder
        return pos.y === 61 ? trapdoor : air
      }
      // Falling for five ticks stays inside the trapdoor. A climbable block caps each tick's
      // descent at 0.15 blocks (0.53 in total); without the ladder the trapdoor is not
      // climbable and the free fall covers 0.76 blocks.
      const start = () => new Vec3(0.5, 61.99, 0.5)
      const climbing = simulate(blockAt, start(), {}, 5, false)
      assert.ok(climbing.position.y > 61.4, `climbing ${climbing.position}`)
      const falling = simulate(pos => (pos.x === 0 && pos.z === 0 && pos.y === 60) ? air : blockAt(pos), start(), {}, 5, false)
      assert.ok(falling.position.y > 61 && falling.position.y < 61.3, `falling ${falling.position}`)
    })
  }
})
