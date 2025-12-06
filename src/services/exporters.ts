import * as THREE from 'three';

export function exportToOBJ(mesh: THREE.Mesh): string {
  const geometry = mesh.geometry;
  const vertices = geometry.attributes.position.array;
  const uvs = geometry.attributes.uv?.array;
  const normals = geometry.attributes.normal.array;
  const indices = geometry.index?.array;

  let objContent = '# Exported from 2D to 3D Converter\n';
  objContent += 'mtllib model.mtl\n';
  objContent += 'usemtl material0\n\n';

  for (let i = 0; i < vertices.length; i += 3) {
    objContent += `v ${vertices[i]} ${vertices[i + 1]} ${vertices[i + 2]}\n`;
  }

  objContent += '\n';

  if (uvs) {
    for (let i = 0; i < uvs.length; i += 2) {
      objContent += `vt ${uvs[i]} ${1 - uvs[i + 1]}\n`;
    }
    objContent += '\n';
  }

  for (let i = 0; i < normals.length; i += 3) {
    objContent += `vn ${normals[i]} ${normals[i + 1]} ${normals[i + 2]}\n`;
  }

  objContent += '\n';

  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] + 1;
      const i2 = indices[i + 1] + 1;
      const i3 = indices[i + 2] + 1;

      if (uvs) {
        objContent += `f ${i1}/${i1}/${i1} ${i2}/${i2}/${i2} ${i3}/${i3}/${i3}\n`;
      } else {
        objContent += `f ${i1}//${i1} ${i2}//${i2} ${i3}//${i3}\n`;
      }
    }
  } else {
    const vertexCount = vertices.length / 3;
    for (let i = 0; i < vertexCount; i += 3) {
      const i1 = i + 1;
      const i2 = i + 2;
      const i3 = i + 3;

      if (uvs) {
        objContent += `f ${i1}/${i1}/${i1} ${i2}/${i2}/${i2} ${i3}/${i3}/${i3}\n`;
      } else {
        objContent += `f ${i1}//${i1} ${i2}//${i2} ${i3}//${i3}\n`;
      }
    }
  }

  return objContent;
}

export function exportToSTL(mesh: THREE.Mesh): string {
  const geometry = mesh.geometry;
  const vertices = geometry.attributes.position.array;
  const indices = geometry.index?.array;

  let stlContent = 'solid model\n';

  const addTriangle = (v1: number[], v2: number[], v3: number[]) => {
    const normal = calculateNormal(v1, v2, v3);
    stlContent += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
    stlContent += `    outer loop\n`;
    stlContent += `      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
    stlContent += `      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
    stlContent += `      vertex ${v3[0]} ${v3[1]} ${v3[2]}\n`;
    stlContent += `    endloop\n`;
    stlContent += `  endfacet\n`;
  };

  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];

      addTriangle(v1, v2, v3);
    }
  } else {
    for (let i = 0; i < vertices.length; i += 9) {
      const v1 = [vertices[i], vertices[i + 1], vertices[i + 2]];
      const v2 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
      const v3 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];

      addTriangle(v1, v2, v3);
    }
  }

  stlContent += 'endsolid model\n';
  return stlContent;
}

export function exportToPLY(mesh: THREE.Mesh): string {
  const geometry = mesh.geometry;
  const vertices = geometry.attributes.position.array;
  const colors = geometry.attributes.color?.array;
  const indices = geometry.index?.array;

  const vertexCount = vertices.length / 3;
  const faceCount = indices ? indices.length / 3 : vertexCount / 3;

  let plyContent = 'ply\n';
  plyContent += 'format ascii 1.0\n';
  plyContent += `element vertex ${vertexCount}\n`;
  plyContent += 'property float x\n';
  plyContent += 'property float y\n';
  plyContent += 'property float z\n';

  if (colors) {
    plyContent += 'property uchar red\n';
    plyContent += 'property uchar green\n';
    plyContent += 'property uchar blue\n';
  }

  plyContent += `element face ${faceCount}\n`;
  plyContent += 'property list uchar int vertex_indices\n';
  plyContent += 'end_header\n';

  for (let i = 0; i < vertices.length; i += 3) {
    plyContent += `${vertices[i]} ${vertices[i + 1]} ${vertices[i + 2]}`;

    if (colors) {
      const r = Math.floor(colors[i] * 255);
      const g = Math.floor(colors[i + 1] * 255);
      const b = Math.floor(colors[i + 2] * 255);
      plyContent += ` ${r} ${g} ${b}`;
    }

    plyContent += '\n';
  }

  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      plyContent += `3 ${indices[i]} ${indices[i + 1]} ${indices[i + 2]}\n`;
    }
  } else {
    for (let i = 0; i < vertexCount; i += 3) {
      plyContent += `3 ${i} ${i + 1} ${i + 2}\n`;
    }
  }

  return plyContent;
}

export function exportToFBX(mesh: THREE.Mesh): string {
  const geometry = mesh.geometry;
  const vertices = geometry.attributes.position.array;
  const indices = geometry.index?.array;

  let fbxContent = '; FBX 7.3.0 project file\n';
  fbxContent += 'FBXHeaderExtension:  {\n';
  fbxContent += '  FBXHeaderVersion: 1003\n';
  fbxContent += '  FBXVersion: 7300\n';
  fbxContent += '}\n\n';

  fbxContent += 'Geometry: 1, "Geometry::Model", "Mesh" {\n';
  fbxContent += '  Vertices: *' + vertices.length + ' {\n    a: ';

  for (let i = 0; i < vertices.length; i++) {
    fbxContent += vertices[i];
    if (i < vertices.length - 1) fbxContent += ',';
  }

  fbxContent += '\n  }\n';

  if (indices) {
    fbxContent += '  PolygonVertexIndex: *' + indices.length + ' {\n    a: ';

    for (let i = 0; i < indices.length; i += 3) {
      fbxContent += `${indices[i]},${indices[i + 1]},${-indices[i + 2] - 1}`;
      if (i < indices.length - 3) fbxContent += ',';
    }

    fbxContent += '\n  }\n';
  }

  fbxContent += '}\n';

  return fbxContent;
}

function calculateNormal(v1: number[], v2: number[], v3: number[]): number[] {
  const u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

  const normal = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];

  const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);

  return [normal[0] / length, normal[1] / length, normal[2] / length];
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
