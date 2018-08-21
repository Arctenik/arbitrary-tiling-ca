{

	let sr3o2 = Math.sqrt(3)/2,
		sr2 = Math.sqrt(2),
		rsr2 = 1/sr2;

	var tilings = [
			{
				name: "Squares",
				defaultRule: "23/3/2",
				width: 1,
				height: 1,
				shapeOrder: ["square"],
				colors: {
					square: [0, 0, 255]
				},
				cells: [
					{
						type: "square",
						vertices: [
							[0, 0],
							[1, 0],
							[1, 1],
							[0, 1]
						],
						neighbors: [
							[0, -1, 0],
							[1, -1, 0],
							[1, 0, 0],
							[1, 1, 0],
							[0, 1, 0],
							[-1, 1, 0],
							[-1, 0, 0],
							[-1, -1, 0]
						]
					}
				]
			},
			{
				name: "Hexagons",
				defaultRule: "3/245/2",
				width: 3,
				height: 2 * sr3o2,
				shapeOrder: ["hexagon"],
				colors: {
					hexagon: [255, 255, 0]
				},
				cells: [
					{
						type: "hexagon",
						vertices: [
							[0.5, 0],
							[1.5, 0],
							[2, sr3o2],
							[1.5, sr3o2 * 2],
							[0.5, sr3o2 * 2],
							[0, sr3o2]
						],
						neighbors: [
							[0, -1, 0],
							[0, -1, 1],
							[0, 0, 1],
							[0, 1, 0],
							[-1, 0, 1],
							[-1, -1, 1]
						]
					},
					{
						type: "hexagon",
						vertices: [
							[2, sr3o2],
							[3, sr3o2],
							[3.5, sr3o2 * 2],
							[3, sr3o2 * 3],
							[2, sr3o2 * 3],
							[1.5, sr3o2 * 2]
						],
						neighbors: [
							[0, -1, 1],
							[1, 0, 0],
							[1, 1, 0],
							[0, 1, 1],
							[0, 1, 0],
							[0, 0, 0]
						]
					}
				]
			},
			{
				name: "Truncated square",
				defaultRule: "34/1/5, 1347/347/4",
				width: 2 * rsr2 + 1,
				height: 2 * rsr2 + 1,
				shapeOrder: ["square", "octagon"],
				colors: {
					square: [0, 0, 255],
					octagon: [0, 255, 0]
				},
				cells: [
					{
						type: "octagon",
						vertices: [
							[rsr2, 0],
							[rsr2 + 1, 0],
							[2 * rsr2 + 1, rsr2],
							[2 * rsr2 + 1, rsr2 + 1],
							[rsr2 + 1, 2 * rsr2 + 1],
							[rsr2, 2 * rsr2 + 1],
							[0, rsr2 + 1],
							[0, 1 * rsr2]
						],
						neighbors: [
							[0, -1, 0],
							[0, -1, 1],
							[1, 0, 0],
							[0, 0, 1],
							[0, 1, 0],
							[-1, 0, 1],
							[-1, 0, 0],
							[-1, -1, 1]
						]
					},
					{
						type: "square",
						vertices: [
							[2 * rsr2 + 1, rsr2 + 1],
							[rsr2 + 1 + sr2, 2 * rsr2 + 1],
							[2 * rsr2 + 1, rsr2 + 1 + sr2],
							[rsr2 + 1, 2 * rsr2 + 1]
						],
						neighbors: [
							[1, 0, 0],
							[1, 1, 0],
							[0, 1, 0],
							[0, 0, 0]
						]
					}
				]
			}
		];
		
}